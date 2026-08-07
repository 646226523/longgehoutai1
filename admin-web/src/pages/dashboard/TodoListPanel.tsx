import { useState } from 'react';
import { Card, Button, Tag } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import type { TodoItem } from './mockData';

interface TodoListPanelProps {
  todos: TodoItem[];
  onNavigate: (path: string) => void;
}

const COLOR_MAP: Record<TodoItem['businessKey'], string> = {
  gene: '#1677ff',
  nft: '#faad14',
  race: '#52c41a',
  user: '#722ed1',
};

const TodoListPanel = ({ todos, onNavigate }: TodoListPanelProps) => {
  const [expanded, setExpanded] = useState(false);

  const visibleTodos = expanded ? todos : todos.slice(0, 3);

  return (
    <Card
      title="待办事项"
      extra={
        <Button type="link" onClick={() => setExpanded((prev) => !prev)}>
          {expanded ? '收起' : '展开全部'}
        </Button>
      }
      styles={{
        body: { paddingBottom: 8 },
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visibleTodos.map((todo) => {
          const color = COLOR_MAP[todo.businessKey];
          return (
            <div
              key={todo.id}
              onClick={() => onNavigate(todo.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: 12,
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fafafa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: color,
                  marginRight: 12,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: '#262626',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {todo.title}
              </span>
              <Tag
                color={color}
                style={{
                  marginRight: 8,
                  marginLeft: 12,
                  flexShrink: 0,
                }}
              >
                {todo.count} {todo.unit}
              </Tag>
              <RightOutlined style={{ color: '#bfbfbf', fontSize: 12, flexShrink: 0 }} />
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default TodoListPanel;
