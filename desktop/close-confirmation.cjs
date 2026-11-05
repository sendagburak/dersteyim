function installCloseConfirmation(window, dialog) {
  window.webContents.on('will-prevent-unload', event => {
    const choice = dialog.showMessageBoxSync(window, {
      type: 'warning',
      title: 'Kaydedilmemiş yoklama',
      message: 'Kaydedilmemiş yoklama değişiklikleri var.',
      detail: 'Kaydetmeden çıkarsanız bu değişiklikler kaybolur.',
      buttons: ['Kaydetmeden çık', 'Düzenlemeye dön'],
      defaultId: 1,
      cancelId: 1,
      noLink: true
    });
    // Electron interprets preventDefault here as permission to close.
    if (choice === 0) event.preventDefault();
  });
}
module.exports = {installCloseConfirmation};
