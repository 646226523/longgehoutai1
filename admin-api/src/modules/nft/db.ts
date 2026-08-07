// NFT 资产管理模块 - 数据库初始化(建表 + 示例数据)
// 由主 db.ts 在 initDatabase 末尾调用 initNftDb(db)
// 跨模块依赖:gene_profiles(id, ring_number, name, owner_name) 由基因模块维护
import type { Database } from '../../sqlite-compat';

// ============ 类型定义(供路由复用)============
export interface NftAssetRow {
  id: number;
  token_id: string | null; // 链上 token 标识(上链后回写)
  gene_profile_id: number | null; // 关联基因档案 ID
  name: string; // 资产名称
  description: string | null; // 资产描述
  image_url: string | null; // 资产图片
  metadata: string | null; // JSON 元数据(TEXT)
  owner_name: string; // 持有者(鸽主)
  status: string; // draft/pending/approved/minting/minted/failed
  contract_address: string | null; // 合约地址
  tx_hash: string | null; // 铸造交易哈希
  minted_at: number | null; // 上链时间
  created_at: number;
  updated_at: number;
}

export interface NftMintTaskRow {
  id: number;
  nft_asset_id: number;
  status: string; // pending/processing/success/failed
  retry_count: number;
  error_msg: string | null;
  tx_hash: string | null;
  contract_address: string | null;
  started_at: number | null;
  finished_at: number | null;
  created_at: number;
}

export interface NftTransferRow {
  id: number;
  nft_asset_id: number;
  from_owner: string | null; // 转出方
  to_owner: string; // 转入方
  transfer_type: string; // transfer/auction/gift 转让/拍卖/赠与
  price: number | null; // 成交价
  tx_hash: string | null; // 流转交易哈希
  status: string; // pending/success/failed
  created_at: number;
}

// NFT 资产状态枚举
export const NFT_STATUS = {
  DRAFT: 'draft', // 草稿
  PENDING: 'pending', // 待审核
  APPROVED: 'approved', // 审核通过
  MINTING: 'minting', // 上链中
  MINTED: 'minted', // 已上链
  FAILED: 'failed', // 上链失败
} as const;

// 上链任务状态枚举
export const MINT_TASK_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
} as const;

// 初始化 NFT 模块:建表 + 初始示例数据(幂等)
export function initNftDb(db: Database): void {
  // ============ 表结构 ============
  db.exec(`
    CREATE TABLE IF NOT EXISTS nft_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_id TEXT,                              -- 链上 token 标识(上链后回写)
      gene_profile_id INTEGER,                    -- 关联基因档案 ID
      name TEXT NOT NULL DEFAULT '',              -- 资产名称
      description TEXT,                           -- 资产描述
      image_url TEXT,                             -- 资产图片 URL
      metadata TEXT,                              -- JSON 元数据(TEXT)
      owner_name TEXT NOT NULL DEFAULT '',        -- 持有者(鸽主)
      status TEXT NOT NULL DEFAULT 'draft',       -- draft/pending/approved/minting/minted/failed
      contract_address TEXT,                      -- 合约地址
      tx_hash TEXT,                               -- 铸造交易哈希
      minted_at INTEGER,                          -- 上链时间
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (gene_profile_id) REFERENCES gene_profiles(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS nft_mint_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nft_asset_id INTEGER NOT NULL,             -- 关联 NFT 资产
      status TEXT NOT NULL DEFAULT 'pending',    -- pending/processing/success/failed
      retry_count INTEGER NOT NULL DEFAULT 0,    -- 重试次数
      error_msg TEXT,                            -- 失败原因
      tx_hash TEXT,                              -- 交易哈希(成功后回写)
      contract_address TEXT,                     -- 合约地址(成功后回写)
      started_at INTEGER,                        -- 开始处理时间
      finished_at INTEGER,                       -- 完成时间
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (nft_asset_id) REFERENCES nft_assets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS nft_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nft_asset_id INTEGER NOT NULL,             -- 关联 NFT 资产
      from_owner TEXT,                           -- 转出方
      to_owner TEXT NOT NULL DEFAULT '',          -- 转入方
      transfer_type TEXT NOT NULL DEFAULT 'transfer', -- transfer/auction/gift
      price REAL,                                -- 成交价
      tx_hash TEXT,                              -- 流转交易哈希
      status TEXT NOT NULL DEFAULT 'success',    -- pending/success/failed
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (nft_asset_id) REFERENCES nft_assets(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_nft_assets_status ON nft_assets(status);
    CREATE INDEX IF NOT EXISTS idx_nft_assets_owner ON nft_assets(owner_name);
    CREATE INDEX IF NOT EXISTS idx_nft_assets_gene ON nft_assets(gene_profile_id);
    CREATE INDEX IF NOT EXISTS idx_nft_mint_tasks_asset ON nft_mint_tasks(nft_asset_id);
    CREATE INDEX IF NOT EXISTS idx_nft_mint_tasks_status ON nft_mint_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_nft_transfers_asset ON nft_transfers(nft_asset_id);
  `);

  // ============ 初始示例数据(仅首次建库时写入)============
  const count = (db.prepare('SELECT COUNT(*) AS c FROM nft_assets').get() as { c: number }).c;
  if (count > 0) return;

  // 跨模块查询 gene_profiles 获取关联档案(容错:若基因表尚未初始化则跳过)
  let geneProfiles: Array<{ id: number; ring_number: string; name: string; owner_name: string }> = [];
  try {
    geneProfiles = db
      .prepare('SELECT id, ring_number, name, owner_name FROM gene_profiles ORDER BY id ASC LIMIT 5')
      .all() as Array<{ id: number; ring_number: string; name: string; owner_name: string }>;
  } catch {
    // gene_profiles 表可能尚未创建,容错跳过
    geneProfiles = [];
  }

  const insertAsset = db.prepare(
    `INSERT INTO nft_assets
      (token_id, gene_profile_id, name, description, image_url, metadata, owner_name,
       status, contract_address, tx_hash, minted_at)
     VALUES (@token_id, @gene_profile_id, @name, @description, @image_url, @metadata, @owner_name,
             @status, @contract_address, @tx_hash, @minted_at)`
  );

  const insertTask = db.prepare(
    `INSERT INTO nft_mint_tasks
      (nft_asset_id, status, retry_count, error_msg, tx_hash, contract_address, started_at, finished_at)
     VALUES (@nft_asset_id, @status, @retry_count, @error_msg, @tx_hash, @contract_address, @started_at, @finished_at)`
  );

  const insertTransfer = db.prepare(
    `INSERT INTO nft_transfers
      (nft_asset_id, from_owner, to_owner, transfer_type, price, tx_hash, status)
     VALUES (@nft_asset_id, @from_owner, @to_owner, @transfer_type, @price, @tx_hash, @status)`
  );

  const now = Date.now();

  // 构造示例资产
  const assets = [
    {
      // 资产 1:已上链(关联基因档案 1)
      geneIdx: 0,
      name: '苍穹一号·基因溯源纪念卡',
      description: '基于基因档案 CHN-2022-000001 铸造的链上数字资产,记录赛鸽血统与基因信息。',
      status: NFT_STATUS.MINTED,
      tokenId: 'NFT-000001',
      contract: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
      txHash: '0xabc123def4567890123456789abcdef0123456789abcdef0123456789abcdef01',
      mintedAt: now - 86400000 * 7,
      metadata: { ring_number: 'CHN-2022-000001', breed: '詹森', bloodline: '詹森老麦克斯系' },
    },
    {
      // 资产 2:上链中(关联基因档案 2)
      geneIdx: 1,
      name: '雪羽·数字藏品',
      description: '基于基因档案 CHN-2022-000002 铸造的数字藏品。',
      status: NFT_STATUS.MINTING,
      tokenId: null,
      contract: null,
      txHash: null,
      mintedAt: null,
      metadata: { ring_number: 'CHN-2022-000002', breed: '凡龙', bloodline: '凡龙银狐系' },
    },
    {
      // 资产 3:待审核(关联基因档案 3)
      geneIdx: 2,
      name: '苍穹二号·冠军纪念',
      description: '基于基因档案 CHN-2023-000003 铸造的冠军纪念数字资产。',
      status: NFT_STATUS.PENDING,
      tokenId: null,
      contract: null,
      txHash: null,
      mintedAt: null,
      metadata: { ring_number: 'CHN-2023-000003', breed: '詹森', bloodline: '詹森老麦克斯系' },
    },
    {
      // 资产 4:草稿(无关联档案)
      geneIdx: -1,
      name: '风暴·测试资产',
      description: '测试用草稿资产,尚未提交审核。',
      status: NFT_STATUS.DRAFT,
      tokenId: null,
      contract: null,
      txHash: null,
      mintedAt: null,
      metadata: { note: 'draft asset' },
    },
    {
      // 资产 5:上链失败(关联基因档案 1)
      geneIdx: 0,
      name: '苍穹一号·限定版',
      description: '限定版铸造,首次上链失败,待重试。',
      status: NFT_STATUS.FAILED,
      tokenId: null,
      contract: null,
      txHash: null,
      mintedAt: null,
      metadata: { ring_number: 'CHN-2022-000001', edition: 'limited' },
    },
  ];

  const tx = db.transaction(() => {
    let assetId = 0;
    assets.forEach((a) => {
      const gene = a.geneIdx >= 0 ? geneProfiles[a.geneIdx] : null;
      const ownerName = gene?.owner_name ?? '平台';
      const result = insertAsset.run({
        token_id: a.tokenId,
        gene_profile_id: gene?.id ?? null,
        name: a.name,
        description: a.description,
        image_url: '',
        metadata: JSON.stringify(a.metadata),
        owner_name: ownerName,
        status: a.status,
        contract_address: a.contract,
        tx_hash: a.txHash,
        minted_at: a.mintedAt,
      });
      assetId = result.lastInsertRowid as number;

      // 已上链资产:创建 success 任务
      if (a.status === NFT_STATUS.MINTED) {
        insertTask.run({
          nft_asset_id: assetId,
          status: MINT_TASK_STATUS.SUCCESS,
          retry_count: 0,
          error_msg: null,
          tx_hash: a.txHash,
          contract_address: a.contract,
          started_at: a.mintedAt,
          finished_at: a.mintedAt,
        });
        // 流转记录:平台铸造 → 鸽主
        insertTransfer.run({
          nft_asset_id: assetId,
          from_owner: '平台',
          to_owner: ownerName,
          transfer_type: 'gift',
          price: null,
          tx_hash: a.txHash,
          status: 'success',
        });
      }

      // 上链中资产:创建 processing 任务
      if (a.status === NFT_STATUS.MINTING) {
        insertTask.run({
          nft_asset_id: assetId,
          status: MINT_TASK_STATUS.PROCESSING,
          retry_count: 0,
          error_msg: null,
          tx_hash: null,
          contract_address: null,
          started_at: now - 600000,
          finished_at: null,
        });
      }

      // 上链失败资产:创建 failed 任务
      if (a.status === NFT_STATUS.FAILED) {
        insertTask.run({
          nft_asset_id: assetId,
          status: MINT_TASK_STATUS.FAILED,
          retry_count: 1,
          error_msg: '链上合约调用超时,gas 不足',
          tx_hash: null,
          contract_address: null,
          started_at: now - 3600000,
          finished_at: now - 3500000,
        });
      }
    });
  });
  tx();

  // eslint-disable-next-line no-console
  console.log('[DB] NFT 资产管理模块:示例数据已初始化');
}

export default { initNftDb, NFT_STATUS, MINT_TASK_STATUS };
