import React from 'react';
import { Card, Empty } from 'antd';

interface NftMintPreviewProps {
  photo_url?: string;
  name?: string;
  token_id?: string | number;
  breed?: string;
  achievement?: string;
  owner_name?: string;
}

const NftMintPreview: React.FC<NftMintPreviewProps> = ({
  photo_url,
  name,
  token_id = '----',
  breed,
  achievement,
  owner_name,
}) => {
  const cardStyle: React.CSSProperties = {
    borderRadius: 8,
    border: '1px solid #f0f0f0',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 320, margin: '0 auto', width: '100%' }}>
      <Card
        title={<span style={{ fontSize: 14, fontWeight: 600, color: '#1f1f1f' }}>🕊️ NFT 预览</span>}
        variant="borderless"
        styles={{ body: { padding: 16 } }}
        style={cardStyle}
      >
        <div
          style={{
            width: 220,
            height: 220,
            maxWidth: '100%',
            margin: '0 auto 16px',
            borderRadius: 12,
            overflow: 'hidden',
            background: '#f5f5f5',
            border: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {photo_url ? (
            <img
              src={photo_url}
              alt="asset"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Empty description="暂无封面" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: 0 }} />
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1f1f1f' }}>{name || '（未填写）'}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>#{token_id} · Token ID</div>
          </div>
          <div
            style={{
              fontSize: 12,
              padding: '4px 10px',
              borderRadius: 12,
              background: '#fff2e8',
              color: '#fa8c16',
              fontWeight: 600,
            }}
          >
            未定价
          </div>
        </div>
      </Card>

      <Card
        title={<span style={{ fontSize: 14, fontWeight: 600, color: '#1f1f1f' }}>资产属性</span>}
        variant="borderless"
        styles={{ body: { padding: 16 } }}
        style={cardStyle}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            ['品系', breed],
            ['赛绩', achievement],
            ['鸽主', owner_name],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#8c8c8c' }}>{label}</span>
              <span style={{ color: '#1f1f1f', fontWeight: 500 }}>{value || '—'}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default NftMintPreview;
