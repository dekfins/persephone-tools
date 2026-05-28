class ToastManager {
  show = $state(false);
  message = $state('');
  private timer: ReturnType<typeof setTimeout> | null = null;

  notify(msg: string) {
    this.message = msg;
    this.show = true;
    
    // Clear any existing timer so spam-clicking doesn't break the toast
    if (this.timer) clearTimeout(this.timer);
    
    this.timer = setTimeout(() => {
      this.show = false;
    }, 3000);
  }
}

export const toastState = new ToastManager();