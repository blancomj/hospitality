import { describe, it, expect } from 'vitest';
import { createApp, h } from 'vue';
import Toast, { useToast } from 'vue-toastification';

const montarApp = (registrarPlugin: boolean) => {
  const root = document.createElement('div');
  document.body.appendChild(root);

  const App = {
    setup() {
      const toast = useToast();
      return () => h('button', { onClick: () => toast.success('Correo enviado') }, 'x');
    },
  };

  const app = createApp(App);
  if (registrarPlugin) app.use(Toast, { timeout: 5000 });
  app.mount(root);
  return root;
};

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('Plugin de notificaciones (vue-toastification)', () => {
  it('con el plugin registrado, el mensaje aparece en el DOM', async () => {
    const root = montarApp(true);
    await esperar(100);
    root.querySelector('button')!.click();
    await esperar(600);

    expect(document.querySelector('[class*="Toastification__container"]')).not.toBeNull();
    expect(document.body.textContent).toContain('Correo enviado');
  });

  it('sin el plugin no aparece nada y tampoco se lanza error (causa del bug)', async () => {
    const root = montarApp(false);
    await esperar(100);
    root.querySelector('button')!.click();
    await esperar(600);

    expect(root.textContent).toBe('x');
  });
});
