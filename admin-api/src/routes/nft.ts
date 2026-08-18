// NFT 资产管理模块 - 后端路由
// 挂载于 /api/nft,所有接口需登录鉴权
// 子模块:资产铸造与元数据、上链审核与异步上链队列、资产流转记录与链上状态监控
import { Router, Response } from 'express';
import db from '../db';
import { authenticate, requirePermission } from '../middlewares/auth';
import { auditMiddleware } from '../middlewares/audit';
import type { AuthedRequest, ApiResponse } from '../types';
import { NFT_STATUS, MINT_TASK_STATUS } from '../modules/nft/db';
import type {
  NftAssetRow,
  NftMintTaskRow,
  NftTransferRow,
} from '../modules/nft/db';

export const nftRouter = Router();

// 统一成功响应
function ok<T>(res: Response, data: T, message = 'success'): Response {
  const body: ApiResponse<T> = { code: 0, message, data };
  return res.json(body);
}

// 统一失败响应
function fail(res: Response, status: number, message: string): Response {
  const body: ApiResponse = { code: status, message, data: null };
  return res.status(status).json(body);
}

// 所有 NFT 模块接口均需登录鉴权
nftRouter.use(authenticate);

// ==================== 跨模块查询辅助 ====================

// 基因档案简要信息(供列表关联展示)
interface GeneBrief {
  id: number;
  ring_number: string;
  name: string;
  owner_name: string;
}

// 跨模块查询基因档案(容错:表不存在或查询失败返回 null)
function getGeneBrief(geneProfileId: number | null): GeneBrief | null {
  if (!geneProfileId) return null;
  try {
    const row = db
      .prepare('SELECT id, ring_number, name, owner_name FROM gene_profiles WHERE id = ?')
      .get(geneProfileId) as GeneBrief | undefined;
    return row ?? null;
  } catch {
    // gene_profiles 表可能尚未创建,容错返回 null
    return null;
  }
}

// 批量查询基因档案简要(容错)
function getGeneBriefMap(ids: number[]): Map<number, GeneBrief> {
  const map = new Map<number, GeneBrief>();
  if (!ids.length) return map;
  try {
    const placeholders = ids.map(() => '?').join(',');
    const rows = db
      .prepare(
        `SELECT id, ring_number, name, owner_name FROM gene_profiles WHERE id IN (${placeholders})`
      )
      .all(...ids) as GeneBrief[];
    rows.forEach((r) => map.set(r.id, r));
  } catch {
    // 容错:返回空 map
  }
  return map;
}

// 资产状态标签映射
const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  pending: '待审核',
  approved: '审核通过',
  minting: '上链中',
  minted: '已上链',
  failed: '上链失败',
  rejected: '已驳回',
};

// ==================== 资产列表与详情 ====================

// GET /api/nft/assets - 分页列表(资产名/状态/鸽主筛选)
nftRouter.get('/assets', requirePermission('nft:view'), (req: AuthedRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
  const name = String(req.query.name ?? '').trim();
  const status = String(req.query.status ?? '').trim();
  const owner_name = String(req.query.owner_name ?? '').trim();

  const where: string[] = [];
  const params: Array<string | number> = [];
  if (name) {
    where.push('(a.name LIKE ? OR a.token_id LIKE ?)');
    params.push(`%${name}%`, `%${name}%`);
  }
  if (status) {
    where.push('a.status = ?');
    params.push(status);
  }
  if (owner_name) {
    where.push('a.owner_name LIKE ?');
    params.push(`%${owner_name}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM nft_assets a ${whereSql}`).get(...params) as { c: number }
  ).c;

  const rows = db
    .prepare(
      `SELECT a.id, a.token_id, a.gene_profile_id, a.name, a.description, a.image_url,
              a.metadata, a.owner_name, a.status, a.contract_address, a.tx_hash,
              a.minted_at, a.created_at, a.updated_at
       FROM nft_assets a
       ${whereSql}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize) as NftAssetRow[];

  // 批量关联基因档案信息
  const geneIds = rows.map((r) => r.gene_profile_id).filter((id): id is number => id !== null);
  const geneMap = getGeneBriefMap(geneIds);

  const list = rows.map((r) => ({
    ...r,
    status_label: STATUS_LABEL[r.status] ?? r.status,
    gene_profile: r.gene_profile_id ? geneMap.get(r.gene_profile_id) ?? null : null,
  }));

  return ok(res, { list, total });
});

// GET /api/nft/assets/:id - 详情(含流转记录 + 上链任务 + 链上状态 + 关联基因档案)
nftRouter.get('/assets/:id', requirePermission('nft:view'), (req: AuthedRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return fail(res, 400, '无效的资产 ID');

  const asset = db
    .prepare(
      `SELECT id, token_id, gene_profile_id, name, description, image_url, metadata,
              owner_name, status, contract_address, tx_hash, minted_at, created_at, updated_at
       FROM nft_assets WHERE id = ?`
    )
    .get(id) as NftAssetRow | undefined;
  if (!asset) return fail(res, 404, 'NFT 资产不存在');

  // 关联流转记录
  const transfers = db
    .prepare(
      `SELECT id, nft_asset_id, from_owner, to_owner, transfer_type, price, tx_hash, status, created_at
       FROM nft_transfers WHERE nft_asset_id = ? ORDER BY created_at DESC`
    )
    .all(id) as NftTransferRow[];

  // 关联上链任务(取最近一条)
  const mintTask = db
    .prepare(
      `SELECT id, nft_asset_id, status, retry_count, error_msg, tx_hash, contract_address,
              started_at, finished_at, created_at
       FROM nft_mint_tasks WHERE nft_asset_id = ? ORDER BY id DESC LIMIT 1`
    )
    .get(id) as NftMintTaskRow | undefined;

  // 跨模块查询基因档案(容错)
  const geneProfile = getGeneBrief(asset.gene_profile_id);

  return ok(res, {
    ...asset,
    status_label: STATUS_LABEL[asset.status] ?? asset.status,
    transfers,
    mint_task: mintTask ?? null,
    gene_profile: geneProfile,
    // 链上状态信息
    chain_status: {
      token_id: asset.token_id,
      contract_address: asset.contract_address,
      tx_hash: asset.tx_hash,
      minted_at: asset.minted_at,
      status: asset.status,
    },
  });
});

// POST /api/nft/assets - 新增铸造申请(选择 gene_profile_id,状态草稿)
nftRouter.post(
  '/assets',
  requirePermission('nft:edit'),
  auditMiddleware('nft', 'create_asset'),
  (req: AuthedRequest, res: Response) => {
    const body = req.body as {
      gene_profile_id?: number | null;
      name?: string;
      description?: string;
      image_url?: string;
      metadata?: Record<string, unknown> | string | null;
      owner_name?: string;
    };

    const name = String(body.name ?? '').trim();
    if (!name) return fail(res, 400, '资产名称不能为空');

    // 校验关联基因档案存在性(跨模块容错)
    let ownerName = String(body.owner_name ?? '').trim();
    if (body.gene_profile_id) {
      const gene = getGeneBrief(body.gene_profile_id);
      if (!gene) return fail(res, 400, '指定的基因档案不存在');
      // 自动填充鸽主
      if (!ownerName) ownerName = gene.owner_name;
    }

    // metadata 序列化为字符串
    let metadataText: string | null = null;
    if (body.metadata !== undefined && body.metadata !== null) {
      if (typeof body.metadata === 'string') {
        metadataText = body.metadata;
      } else {
        try {
          metadataText = JSON.stringify(body.metadata);
        } catch {
          metadataText = null;
        }
      }
    }

    const result = db
      .prepare(
        `INSERT INTO nft_assets
          (gene_profile_id, name, description, image_url, metadata, owner_name, status)
         VALUES (?, ?, ?, ?, ?, ?, 'draft')`
      )
      .run(
        body.gene_profile_id ?? null,
        name,
        body.description ?? null,
        body.image_url ?? null,
        metadataText,
        ownerName
      );

    return ok(res, { id: result.lastInsertRowid }, '铸造申请已创建(草稿状态)');
  }
);

// PUT /api/nft/assets/:id - 编辑(仅草稿/上链失败状态可编辑)
nftRouter.put(
  '/assets/:id',
  requirePermission('nft:edit'),
  auditMiddleware('nft', 'update_asset'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的资产 ID');

    const target = db.prepare(
      'SELECT id, status, gene_profile_id, name, description, image_url, metadata, owner_name FROM nft_assets WHERE id = ?'
    ).get(id) as
      | {
          id: number;
          status: string;
          gene_profile_id: number | null;
          name: string;
          description: string | null;
          image_url: string | null;
          metadata: string | null;
          owner_name: string;
        }
      | undefined;
    if (!target) return fail(res, 404, 'NFT 资产不存在');

    // 仅草稿、待审核、上链失败状态可编辑
    const editableStatus: string[] = [NFT_STATUS.DRAFT, NFT_STATUS.PENDING, NFT_STATUS.FAILED];
    if (!editableStatus.includes(target.status)) {
      return fail(res, 400, `当前状态【${STATUS_LABEL[target.status] ?? target.status}】不可编辑`);
    }

    const body = req.body as {
      gene_profile_id?: number | null;
      name?: string;
      description?: string;
      image_url?: string;
      metadata?: Record<string, unknown> | string | null;
      owner_name?: string;
    };

    // 计算各字段最终值:未传入则保留原值
    const finalName = body.name !== undefined ? String(body.name).trim() : target.name;
    if (!finalName) return fail(res, 400, '资产名称不能为空');

    const finalGeneId =
      body.gene_profile_id !== undefined ? body.gene_profile_id : target.gene_profile_id;
    const finalDescription = body.description !== undefined ? body.description : target.description;
    const finalImageUrl = body.image_url !== undefined ? body.image_url : target.image_url;
    const finalOwnerName =
      body.owner_name !== undefined ? String(body.owner_name).trim() : target.owner_name;

    // 校验关联基因档案(跨模块容错),若 gene_profile_id 变更且未显式传入鸽主,则自动填充
    let autoOwnerName: string | undefined;
    if (finalGeneId) {
      const gene = getGeneBrief(finalGeneId);
      if (!gene) return fail(res, 400, '指定的基因档案不存在');
      // gene_profile_id 变更且未显式传入鸽主时,自动用基因档案的鸽主填充
      if (body.gene_profile_id !== undefined && body.owner_name === undefined) {
        autoOwnerName = gene.owner_name;
      }
    }
    const finalOwnerNameResolved = autoOwnerName ?? finalOwnerName;

    // metadata 序列化:未传入则保留原值
    let finalMetadata: string | null;
    if (body.metadata === undefined) {
      finalMetadata = target.metadata;
    } else if (body.metadata === null) {
      finalMetadata = null;
    } else if (typeof body.metadata === 'string') {
      finalMetadata = body.metadata;
    } else {
      try {
        finalMetadata = JSON.stringify(body.metadata);
      } catch {
        finalMetadata = target.metadata;
      }
    }

    db.prepare(
      `UPDATE nft_assets
       SET gene_profile_id = ?, name = ?, description = ?, image_url = ?, metadata = ?,
           owner_name = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      finalGeneId ?? null,
      finalName,
      finalDescription,
      finalImageUrl,
      finalMetadata,
      finalOwnerNameResolved,
      Date.now(),
      id
    );

    return ok(res, null, '更新成功');
  }
);

// POST /api/nft/assets/:id/submit - 提交审核(草稿/上链失败 → 待审核)
nftRouter.post(
  '/assets/:id/submit',
  requirePermission('nft:edit'),
  auditMiddleware('nft', 'submit_audit'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的资产 ID');

    const target = db.prepare('SELECT id, status FROM nft_assets WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!target) return fail(res, 404, 'NFT 资产不存在');

    const submittableStatus: string[] = [NFT_STATUS.DRAFT, NFT_STATUS.FAILED];
    if (!submittableStatus.includes(target.status)) {
      return fail(res, 400, `当前状态【${STATUS_LABEL[target.status] ?? target.status}】不可提交审核`);
    }

    db.prepare('UPDATE nft_assets SET status = ?, updated_at = ? WHERE id = ?').run(
      NFT_STATUS.PENDING,
      Date.now(),
      id
    );

    return ok(res, null, '已提交审核');
  }
);

// DELETE /api/nft/assets/:id - 删除(仅草稿/上链失败状态可删除)
nftRouter.delete(
  '/assets/:id',
  requirePermission('nft:edit'),
  auditMiddleware('nft', 'delete_asset'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的资产 ID');

    const target = db.prepare('SELECT id, status FROM nft_assets WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!target) return fail(res, 404, 'NFT 资产不存在');

    const deletableStatus: string[] = [NFT_STATUS.DRAFT, NFT_STATUS.PENDING, NFT_STATUS.FAILED];
    if (!deletableStatus.includes(target.status)) {
      return fail(res, 400, `当前状态【${STATUS_LABEL[target.status] ?? target.status}】不可删除`);
    }

    db.prepare('DELETE FROM nft_assets WHERE id = ?').run(id);
    return ok(res, null, '删除成功');
  }
);

// ==================== 资产流转记录 ====================

// GET /api/nft/assets/:id/transfers - 资产流转记录列表
nftRouter.get(
  '/assets/:id/transfers',
  requirePermission('nft:view'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的资产 ID');

    const target = db.prepare('SELECT id FROM nft_assets WHERE id = ?').get(id);
    if (!target) return fail(res, 404, 'NFT 资产不存在');

    const rows = db
      .prepare(
        `SELECT id, nft_asset_id, from_owner, to_owner, transfer_type, price, tx_hash, status, created_at
         FROM nft_transfers WHERE nft_asset_id = ? ORDER BY created_at DESC`
      )
      .all(id) as NftTransferRow[];

    return ok(res, rows);
  }
);

// POST /api/nft/assets/:id/transfers - 新增流转记录
nftRouter.post(
  '/assets/:id/transfers',
  requirePermission('nft:edit'),
  auditMiddleware('nft', 'create_transfer'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的资产 ID');

    const target = db.prepare('SELECT id, owner_name FROM nft_assets WHERE id = ?').get(id) as
      | { id: number; owner_name: string }
      | undefined;
    if (!target) return fail(res, 404, 'NFT 资产不存在');

    const body = req.body as {
      from_owner?: string | null;
      to_owner?: string;
      transfer_type?: string;
      price?: number | null;
      tx_hash?: string | null;
      status?: string;
    };

    const toOwner = String(body.to_owner ?? '').trim();
    if (!toOwner) return fail(res, 400, '转入方不能为空');

    const transferType = body.transfer_type ?? 'transfer';
    const validTypes = ['transfer', 'auction', 'gift'];
    if (!validTypes.includes(transferType)) {
      return fail(res, 400, '流转类型无效(可选:transfer/auction/gift)');
    }

    const result = db
      .prepare(
        `INSERT INTO nft_transfers
          (nft_asset_id, from_owner, to_owner, transfer_type, price, tx_hash, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        body.from_owner ?? target.owner_name,
        toOwner,
        transferType,
        body.price ?? null,
        body.tx_hash ?? null,
        body.status ?? 'success'
      );

    // 若流转成功,更新资产持有者
    if ((body.status ?? 'success') === 'success') {
      db.prepare('UPDATE nft_assets SET owner_name = ?, updated_at = ? WHERE id = ?').run(
        toOwner,
        Date.now(),
        id
      );
    }

    return ok(res, { id: result.lastInsertRowid }, '流转记录已新增');
  }
);

// GET /api/nft/assets/:id/chain-status - 链上状态查询
nftRouter.get(
  '/assets/:id/chain-status',
  requirePermission('nft:view'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的资产 ID');

    const asset = db
      .prepare(
        'SELECT id, token_id, contract_address, tx_hash, minted_at, status FROM nft_assets WHERE id = ?'
      )
      .get(id) as
      | {
          id: number;
          token_id: string | null;
          contract_address: string | null;
          tx_hash: string | null;
          minted_at: number | null;
          status: string;
        }
      | undefined;
    if (!asset) return fail(res, 404, 'NFT 资产不存在');

    return ok(res, {
      token_id: asset.token_id,
      contract_address: asset.contract_address,
      tx_hash: asset.tx_hash,
      minted_at: asset.minted_at,
      status: asset.status,
      status_label: STATUS_LABEL[asset.status] ?? asset.status,
    });
  }
);

// ==================== 上链审核 ====================

// GET /api/nft/audit/list - 待审核列表(默认查待审核,可查全部审核相关状态)
nftRouter.get('/audit/list', requirePermission('nft:audit'), (req: AuthedRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
  const status = String(req.query.status ?? NFT_STATUS.PENDING).trim();
  const name = String(req.query.name ?? '').trim();
  const owner_name = String(req.query.owner_name ?? '').trim();

  const where: string[] = [];
  const params: Array<string | number> = [];
  if (status) {
    where.push('a.status = ?');
    params.push(status);
  }
  if (name) {
    where.push('(a.name LIKE ? OR a.token_id LIKE ?)');
    params.push(`%${name}%`, `%${name}%`);
  }
  if (owner_name) {
    where.push('a.owner_name LIKE ?');
    params.push(`%${owner_name}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM nft_assets a ${whereSql}`).get(...params) as { c: number }
  ).c;

  const rows = db
    .prepare(
      `SELECT a.id, a.token_id, a.gene_profile_id, a.name, a.description, a.image_url,
              a.metadata, a.owner_name, a.status, a.contract_address, a.tx_hash,
              a.minted_at, a.created_at, a.updated_at
       FROM nft_assets a
       ${whereSql}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize) as NftAssetRow[];

  // 批量关联基因档案
  const geneIds = rows.map((r) => r.gene_profile_id).filter((id): id is number => id !== null);
  const geneMap = getGeneBriefMap(geneIds);

  const list = rows.map((r) => ({
    ...r,
    status_label: STATUS_LABEL[r.status] ?? r.status,
    gene_profile: r.gene_profile_id ? geneMap.get(r.gene_profile_id) ?? null : null,
  }));

  return ok(res, { list, total });
});

// 生成模拟链上标识
function generateChainIdentifiers(): { tokenId: string; contractAddress: string; txHash: string } {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 1e8).toString(16).padStart(8, '0');
  return {
    tokenId: `NFT-${ts.toString(36).toUpperCase()}-${rand.slice(0, 6).toUpperCase()}`,
    contractAddress: `0x${rand}${Math.floor(Math.random() * 1e16).toString(16).padStart(16, '0')}`,
    txHash: `0x${ts.toString(16)}${rand}${Math.floor(Math.random() * 1e16)
      .toString(16)
      .padStart(16, '0')}`,
  };
}

// 模拟上链:用 setImmediate 异步执行,模拟调用链上合约铸造
// 成功后回写 tx_hash/contract_address/token_id,更新 nft_assets 为已上链
function simulateMint(assetId: number, taskId: number): void {
  // 标记任务为 processing
  db.prepare(
    'UPDATE nft_mint_tasks SET status = ?, started_at = ? WHERE id = ?'
  ).run(MINT_TASK_STATUS.PROCESSING, Date.now(), taskId);

  setImmediate(() => {
    try {
      const { tokenId, contractAddress, txHash } = generateChainIdentifiers();
      const finishedAt = Date.now();

      const tx = db.transaction(() => {
        // 更新任务为 success
        db.prepare(
          `UPDATE nft_mint_tasks
           SET status = ?, tx_hash = ?, contract_address = ?, finished_at = ?, error_msg = NULL
           WHERE id = ?`
        ).run(MINT_TASK_STATUS.SUCCESS, txHash, contractAddress, finishedAt, taskId);

        // 更新资产为已上链
        db.prepare(
          `UPDATE nft_assets
           SET status = ?, token_id = ?, tx_hash = ?, contract_address = ?, minted_at = ?, updated_at = ?
           WHERE id = ?`
        ).run(
          NFT_STATUS.MINTED,
          tokenId,
          txHash,
          contractAddress,
          finishedAt,
          finishedAt,
          assetId
        );
      });
      tx();
      // eslint-disable-next-line no-console
      console.log(`[NFT] 资产 ${assetId} 模拟上链成功,token_id=${tokenId}`);
    } catch (err) {
      // 上链失败
      db.prepare(
        `UPDATE nft_mint_tasks
         SET status = ?, error_msg = ?, finished_at = ?
         WHERE id = ?`
      ).run(
        MINT_TASK_STATUS.FAILED,
        err instanceof Error ? err.message : '模拟上链异常',
        Date.now(),
        taskId
      );
      db.prepare('UPDATE nft_assets SET status = ?, updated_at = ? WHERE id = ?').run(
        NFT_STATUS.FAILED,
        Date.now(),
        assetId
      );
      // eslint-disable-next-line no-console
      console.error(`[NFT] 资产 ${assetId} 模拟上链失败:`, err);
    }
  });
}

// POST /api/nft/audit/:id/approve - 审核通过(创建 mint_task,更新资产为上链中,异步模拟上链)
nftRouter.post(
  '/audit/:id/approve',
  requirePermission('nft:audit'),
  auditMiddleware('nft', 'approve_mint'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的资产 ID');

    const target = db.prepare('SELECT id, status FROM nft_assets WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!target) return fail(res, 404, 'NFT 资产不存在');

    if (target.status !== NFT_STATUS.PENDING) {
      return fail(res, 400, `当前状态【${STATUS_LABEL[target.status] ?? target.status}】不可审核`);
    }

    // 事务:创建 pending 任务 + 更新资产为审核通过→上链中
    let taskId = 0;
    const tx = db.transaction(() => {
      // 更新资产状态:审核通过 → 上链中(直接进入上链流程)
      db.prepare('UPDATE nft_assets SET status = ?, updated_at = ? WHERE id = ?').run(
        NFT_STATUS.MINTING,
        Date.now(),
        id
      );
      // 创建 pending 任务
      const result = db
        .prepare(
          `INSERT INTO nft_mint_tasks (nft_asset_id, status, retry_count) VALUES (?, 'pending', 0)`
        )
        .run(id);
      taskId = result.lastInsertRowid as number;
    });
    tx();

    // 异步模拟上链(不阻塞响应)
    simulateMint(id, taskId);

    return ok(res, { task_id: taskId }, '审核通过,已进入上链队列,正在异步铸造');
  }
);

// POST /api/nft/audit/:id/reject - 审核驳回
nftRouter.post(
  '/audit/:id/reject',
  requirePermission('nft:audit'),
  auditMiddleware('nft', 'reject_mint'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的资产 ID');

    const body = req.body as { audit_remark?: string };
    const remark = String(body.audit_remark ?? '').trim();
    if (!remark) return fail(res, 400, '请填写驳回理由');

    const target = db.prepare('SELECT id, status FROM nft_assets WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!target) return fail(res, 404, 'NFT 资产不存在');

    if (target.status !== NFT_STATUS.PENDING) {
      return fail(res, 400, `当前状态【${STATUS_LABEL[target.status] ?? target.status}】不可审核`);
    }

    // 驳回后标记为 rejected 状态，供"已驳回"Tab 查询
    db.prepare('UPDATE nft_assets SET status = ?, updated_at = ? WHERE id = ?').run(
      NFT_STATUS.REJECTED,
      Date.now(),
      id
    );

    return ok(res, null, '已驳回');
  }
);

// GET /api/nft/audit/stats - 今日审核统计
nftRouter.get('/audit/stats', requirePermission('nft:audit'), (_req: AuthedRequest, res: Response) => {
  const now = Date.now();
  const startOfDay = now - (now % 86400000);

  const todayApproved = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM nft_assets
         WHERE status IN (?, ?) AND updated_at >= ?`
      )
      .get(NFT_STATUS.MINTING, NFT_STATUS.MINTED, startOfDay) as { c: number }
  ).c;

  const todayMintSuccess = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM nft_assets
         WHERE status = ? AND updated_at >= ?`
      )
      .get(NFT_STATUS.MINTED, startOfDay) as { c: number }
  ).c;

  const todayMintFailed = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM nft_assets
         WHERE status = ? AND updated_at >= ?`
      )
      .get(NFT_STATUS.FAILED, startOfDay) as { c: number }
  ).c;

  const avgRow = db
    .prepare(
      `SELECT AVG(finished_at - started_at) AS avg_sec FROM nft_mint_tasks
       WHERE status = ? AND finished_at >= ? AND started_at IS NOT NULL AND finished_at IS NOT NULL`
    )
    .get(MINT_TASK_STATUS.SUCCESS, startOfDay) as { avg_sec: number | null } | undefined;

  const avgDuration = avgRow?.avg_sec ? Math.round(avgRow.avg_sec) : 0;

  return ok(res, {
    today_approved: todayApproved,
    today_mint_success: todayMintSuccess,
    today_mint_failed: todayMintFailed,
    avg_duration_sec: avgDuration,
  });
});

// POST /api/nft/audit/batch-approve - 批量审核通过
nftRouter.post(
  '/audit/batch-approve',
  requirePermission('nft:audit'),
  auditMiddleware('nft', 'batch_approve_mint'),
  (req: AuthedRequest, res: Response) => {
    const body = req.body as { ids?: number[] };
    const ids = Array.isArray(body.ids) ? body.ids.filter((id) => Number.isFinite(Number(id))) : [];
    if (!ids.length) return fail(res, 400, '请选择要审核的资产');

    let success = 0;
    let failed = 0;

    for (const id of ids) {
      const target = db
        .prepare('SELECT id, status FROM nft_assets WHERE id = ?')
        .get(id) as { id: number; status: string } | undefined;

      if (!target || target.status !== NFT_STATUS.PENDING) {
        failed++;
        continue;
      }

      try {
        const tx = db.transaction(() => {
          db.prepare('UPDATE nft_assets SET status = ?, updated_at = ? WHERE id = ?').run(
            NFT_STATUS.MINTING,
            Date.now(),
            id
          );
          const result = db
            .prepare(
              `INSERT INTO nft_mint_tasks (nft_asset_id, status, retry_count) VALUES (?, 'pending', 0)`
            )
            .run(id);
          return result.lastInsertRowid as number;
        });
        const taskId = tx();
        simulateMint(id, taskId);
        success++;
      } catch {
        failed++;
      }
    }

    return ok(res, { total: ids.length, success, failed }, `批量审核完成:成功${success}条,失败${failed}条`);
  }
);

// POST /api/nft/audit/batch-reject - 批量审核驳回
nftRouter.post(
  '/audit/batch-reject',
  requirePermission('nft:audit'),
  auditMiddleware('nft', 'batch_reject_mint'),
  (req: AuthedRequest, res: Response) => {
    const body = req.body as { ids?: number[]; reject_reason?: string };
    const ids = Array.isArray(body.ids) ? body.ids.filter((id) => Number.isFinite(Number(id))) : [];
    const reason = String(body.reject_reason ?? '').trim();

    if (!ids.length) return fail(res, 400, '请选择要驳回的资产');
    if (!reason) return fail(res, 400, '请填写驳回理由');

    let success = 0;
    let failed = 0;

    for (const id of ids) {
      const target = db
        .prepare('SELECT id, status FROM nft_assets WHERE id = ?')
        .get(id) as { id: number; status: string } | undefined;

      if (!target || target.status !== NFT_STATUS.PENDING) {
        failed++;
        continue;
      }

      try {
        db.prepare('UPDATE nft_assets SET status = ?, updated_at = ? WHERE id = ?').run(
          NFT_STATUS.REJECTED,
          Date.now(),
          id
        );
        success++;
      } catch {
        failed++;
      }
    }

    return ok(res, { total: ids.length, success, failed }, `批量驳回完成:成功${success}条,失败${failed}条`);
  }
);

// POST /api/nft/assets/:id/resubmit - 重新提交审核
nftRouter.post(
  '/assets/:id/resubmit',
  requirePermission('nft:audit'),
  auditMiddleware('nft', 'resubmit_audit'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的资产 ID');

    const target = db.prepare('SELECT id, status FROM nft_assets WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!target) return fail(res, 404, 'NFT 资产不存在');

    const resubmittableStatus: string[] = [NFT_STATUS.DRAFT, NFT_STATUS.FAILED, NFT_STATUS.REJECTED];
    if (!resubmittableStatus.includes(target.status)) {
      return fail(res, 400, `当前状态【${STATUS_LABEL[target.status] ?? target.status}】不可重新提交`);
    }

    db.prepare('UPDATE nft_assets SET status = ?, updated_at = ? WHERE id = ?').run(
      NFT_STATUS.PENDING,
      Date.now(),
      id
    );

    return ok(res, null, '已重新提交审核');
  }
);

// ==================== 上链任务 ====================

// GET /api/nft/tasks - 上链任务列表(可按资产 ID / 状态筛选)
nftRouter.get('/tasks', requirePermission('nft:audit'), (req: AuthedRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
  const nft_asset_id = req.query.nft_asset_id
    ? parseInt(String(req.query.nft_asset_id), 10)
    : undefined;
  const status = String(req.query.status ?? '').trim();

  const where: string[] = [];
  const params: Array<string | number> = [];
  if (nft_asset_id && Number.isFinite(nft_asset_id)) {
    where.push('t.nft_asset_id = ?');
    params.push(nft_asset_id);
  }
  if (status) {
    where.push('t.status = ?');
    params.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM nft_mint_tasks t ${whereSql}`).get(...params) as {
      c: number;
    }
  ).c;

  const rows = db
    .prepare(
      `SELECT t.id, t.nft_asset_id, t.status, t.retry_count, t.error_msg, t.tx_hash,
              t.contract_address, t.started_at, t.finished_at, t.created_at,
              a.name AS asset_name, a.token_id, a.owner_name
       FROM nft_mint_tasks t
       LEFT JOIN nft_assets a ON a.id = t.nft_asset_id
       ${whereSql}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize) as Array<
    NftMintTaskRow & {
      asset_name: string | null;
      token_id: string | null;
      owner_name: string | null;
    }
  >;

  return ok(res, { list: rows, total });
});

// GET /api/nft/tasks/:id - 查询单个上链任务状态
nftRouter.get('/tasks/:id', requirePermission('nft:audit'), (req: AuthedRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return fail(res, 400, '无效的任务 ID');

  const task = db
    .prepare(
      `SELECT t.id, t.nft_asset_id, t.status, t.retry_count, t.error_msg, t.tx_hash,
              t.contract_address, t.started_at, t.finished_at, t.created_at,
              a.name AS asset_name, a.token_id, a.owner_name, a.status AS asset_status
       FROM nft_mint_tasks t
       LEFT JOIN nft_assets a ON a.id = t.nft_asset_id
       WHERE t.id = ?`
    )
    .get(id) as
    | (NftMintTaskRow & {
        asset_name: string | null;
        token_id: string | null;
        owner_name: string | null;
        asset_status: string | null;
      })
    | undefined;
  if (!task) return fail(res, 404, '上链任务不存在');

  return ok(res, task);
});

// POST /api/nft/tasks/:id/retry - 重试失败任务(重新触发模拟上链)
nftRouter.post(
  '/tasks/:id/retry',
  requirePermission('nft:audit'),
  auditMiddleware('nft', 'retry_mint_task'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的任务 ID');

    const task = db
      .prepare('SELECT id, nft_asset_id, status, retry_count FROM nft_mint_tasks WHERE id = ?')
      .get(id) as { id: number; nft_asset_id: number; status: string; retry_count: number } | undefined;
    if (!task) return fail(res, 404, '上链任务不存在');

    if (task.status !== MINT_TASK_STATUS.FAILED) {
      return fail(res, 400, `当前任务状态【${task.status}】不可重试,仅失败任务可重试`);
    }

    // 更新任务为 pending,增加重试次数;资产回到上链中
    db.prepare(
      `UPDATE nft_mint_tasks
       SET status = ?, retry_count = ?, error_msg = NULL, started_at = NULL, finished_at = NULL
       WHERE id = ?`
    ).run(MINT_TASK_STATUS.PENDING, task.retry_count + 1, id);

    db.prepare('UPDATE nft_assets SET status = ?, updated_at = ? WHERE id = ?').run(
      NFT_STATUS.MINTING,
      Date.now(),
      task.nft_asset_id
    );

    // 重新触发模拟上链
    simulateMint(task.nft_asset_id, id);

    return ok(res, null, '已重新触发上链任务');
  }
);

export default nftRouter;
