import { useState, useEffect } from 'react';
import { Card, Typography, Divider } from 'antd';

const { Text } = Typography;

interface GeneFormData {
  ring_number?: string;
  name?: string;
  breed?: string;
  bloodline?: string;
  owner_name?: string;
  photo_url?: string;
}

interface GeneFormPreviewProps {
  formData: GeneFormData;
}

const placeholderStyle: React.CSSProperties = {
  color: '#bfbfbf',
};

const PigeonPlaceholder = () => (
  <svg
    viewBox="0 0 200 200"
    width="120"
    height="120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <ellipse cx="100" cy="130" rx="55" ry="45" fill="#e8e8e8" />
    <ellipse cx="100" cy="75" rx="32" ry="28" fill="#e8e8e8" />
    <circle cx="115" cy="68" r="4" fill="#bfbfbf" />
    <path
      d="M130 72 Q145 70 150 78 Q140 82 130 80"
      fill="#d9d9d9"
    />
    <path
      d="M60 120 Q35 115 30 130 Q45 135 60 130"
      fill="#d9d9d9"
    />
    <path
      d="M140 120 Q165 115 170 130 Q155 135 140 130"
      fill="#d9d9d9"
    />
    <line x1="90" y1="170" x2="88" y2="185" stroke="#bfbfbf" strokeWidth="2" strokeLinecap="round" />
    <line x1="110" y1="170" x2="112" y2="185" stroke="#bfbfbf" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const FieldRow = ({
  label,
  value,
}: {
  label: string;
  value?: string;
}) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
    }}
  >
    <Text type="secondary" style={{ fontSize: 13 }}>
      {label}
    </Text>
    {value ? (
      <Text strong style={{ fontSize: 13, color: '#1f1f1f' }}>
        {value}
      </Text>
    ) : (
      <Text style={placeholderStyle}>—</Text>
    )}
  </div>
);

const GeneFormPreview = ({ formData }: GeneFormPreviewProps) => {
  const { ring_number, name, breed, bloodline, owner_name, photo_url } =
    formData;
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [photo_url]);

  return (
    <Card
      style={{
        borderRadius: 8,
        border: '1px solid #f0f0f0',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
      }}
      styles={{ body: { padding: 16 } }}
    >
      <div
        style={{
          height: 200,
          background: '#fafafa',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          overflow: 'hidden',
        }}
      >
        {photo_url && !imgError ? (
          <img
            src={photo_url}
            alt="鸽只照片"
            onError={() => setImgError(true)}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'cover',
              borderRadius: 4,
            }}
          />
        ) : (
          <PigeonPlaceholder />
        )}
      </div>

      <FieldRow label="足环号" value={ring_number} />
      <Divider style={{ margin: 0 }} />
      <FieldRow label="鸽名" value={name} />
      <Divider style={{ margin: 0 }} />
      <FieldRow
        label="品系/血统"
        value={[breed, bloodline].filter(Boolean).join(' / ')}
      />
      <Divider style={{ margin: 0 }} />
      <FieldRow label="鸽主" value={owner_name} />
    </Card>
  );
};

export default GeneFormPreview;
