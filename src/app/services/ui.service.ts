import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular/standalone';
@Injectable({ providedIn: 'root' })
export class UiService {
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  async toast(message: string, error = false) {
    const t = await this.toastCtrl.create({
      message,
      duration: error ? 5000 : 2600,
      position: 'bottom',
      cssClass: error ? 'gora-toast error-toast' : 'gora-toast',
      buttons: [{ text: 'Dismiss', role: 'cancel' }],
    });
    await t.present();
  }
  async confirm(header: string, message: string, action = 'Confirm') {
    const a = await this.alertCtrl.create({
      header,
      message,
      cssClass: 'gora-alert',
      buttons: [
        { text: 'Keep it', role: 'cancel' },
        { text: action, role: 'confirm' },
      ],
    });
    await a.present();
    return (await a.onDidDismiss()).role === 'confirm';
  }
  async prompt(header: string, message: string, placeholder: string) {
    const a = await this.alertCtrl.create({
      header,
      message,
      inputs: [{ name: 'value', type: 'textarea', placeholder }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Submit', role: 'confirm' },
      ],
    });
    await a.present();
    const r = await a.onDidDismiss();
    return r.role === 'confirm' ? String(r.data?.values?.value || '').trim() : null;
  }
  async run<T>(work: () => Promise<T>, success?: string) {
    try {
      const r = await work();
      if (success) await this.toast(success);
      return r;
    } catch (e) {
      await this.toast((e as Error).message, true);
      return undefined;
    }
  }
}
