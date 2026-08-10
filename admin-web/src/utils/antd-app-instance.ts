import { message as staticMessage, App } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import type { ModalStaticFunctions } from 'antd/es/modal/confirm';
import type { NotificationInstance } from 'antd/es/notification/interface';

type AppInstance = ReturnType<typeof App.useApp>;

let appInstance: AppInstance | null = null;

export function setAppInstance(app: AppInstance): void {
  appInstance = app;
}

export function getApp(): AppInstance {
  return appInstance ?? ({
    message: staticMessage,
  } as unknown as AppInstance);
}

export function getMessage(): MessageInstance {
  return getApp().message ?? staticMessage;
}

export function getModal(): Omit<ModalStaticFunctions, 'warn'> {
  return getApp().modal as any;
}

export function getNotification(): NotificationInstance {
  return getApp().notification;
}
