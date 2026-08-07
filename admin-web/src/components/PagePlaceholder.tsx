import { PageContainer } from '@ant-design/pro-components';
import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

// 通用页面占位组件:用于各业务模块尚未实现具体功能前的占位展示
interface PagePlaceholderProps {
  title: string;
  description?: string;
}

const PagePlaceholder: React.FC<PagePlaceholderProps> = ({ title, description }) => {
  return (
    <PageContainer
      header={{
        title,
        breadcrumb: {},
      }}
    >
      <Card>
        <Title level={4}>{title}</Title>
        <Paragraph type="secondary">
          {description || `「${title}」模块功能开发中,敬请期待。此页面为占位页面,后续将实现具体业务功能。`}
        </Paragraph>
      </Card>
    </PageContainer>
  );
};

export default PagePlaceholder;
