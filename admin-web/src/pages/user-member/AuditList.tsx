import { PageContainer } from '@ant-design/pro-components';
import { Card, Empty, Typography } from 'antd';

const { Title, Paragraph } = Typography;

/**
 * 用户认证审核列表 - 占位组件
 * 该组件用于满足路由入口,后续将实现:实名认证审核 / 鸽主认证审核 / 批量操作等功能。
 */
const AuditList: React.FC = () => {
  return (
    <PageContainer
      header={{
        title: '用户认证审核',
        breadcrumb: {},
      }}
    >
      <Card>
        <Empty
          description={
            <div>
              <Title level={4}>用户认证审核</Title>
              <Paragraph type="secondary">
                此页面为占位页面,后续将实现实名认证审核、鸽主认证审核、批量审核等功能。
              </Paragraph>
            </div>
          }
        />
      </Card>
    </PageContainer>
  );
};

export default AuditList;
