import { useState } from 'react';
import { Card, Button, Tag } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import type { TodoItem } from './mockData';

interface TodoListPanelProps {
  todos: TodoItem[];
  onNavigate: (path: string) => void;
}

const TodoListPanel = ({ todos, onNavigate }: TodoListPanelProps) => {
  const [expanded, setExpanded] = useState(false);

  const visibleTodos = expanded ? todos : todos.slice(0, 3);

  return (
    <Card
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <span
            style={{
              display: 'inline-block',
              width: 3,
              height: 16,
              background: 'linear-gradient(180deg, #00d4ff, #ffcc00)',
              borderRadius: 2,
              marginRight: 8,
            }}
          />
          待办事项
        </span>
      }
      extra={
        <Button
          type="link"
          onClick={() => setExpanded((prev) => !prev)}
          style={{ color: '#00d4ff' }}
        >
          {expanded ? '收起' : '展开全部'}
        </Button>
      }
      style={{
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
      styles={{
        body: { paddingBottom: 8 },
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visibleTodos.map((todo) => {
          return (
            <div
              key={todo.id}
              onClick={() => onNavigate(todo.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: 12,
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0f9ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#00d4ff',
                  marginRight: 12,
                  flexShrink: 0,
                  boxShadow: '0 0 8px rgba(0,212,255,0.5)',
                }}
              />
              <span
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: '#1f1f1f',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {todo.title}
              </span>
              <Tag
                color="#00d4ff"
                style={{
                  marginRight: 8,
                  marginLeft: 12,
                  flexShrink: 0,
                  borderRadius: 4,
                }}
              >
                {todo.count} {todo.unit}
              </Tag>
              <RightOutlined style={{ color: '#00d4ff', fontSize: 12, flexShrink: 0 }} />
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default TodoListPanel;