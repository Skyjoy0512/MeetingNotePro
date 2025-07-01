// sonner toast用のフック
import { toast } from 'sonner';

export interface Toast {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const toastFn = (props: Toast) => {
    if (props.variant === 'destructive') {
      toast.error(props.title, {
        description: props.description,
      });
    } else {
      toast.success(props.title, {
        description: props.description,
      });
    }
  };

  return {
    toast: toastFn,
  };
}