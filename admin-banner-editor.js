(function initAdminBannerEditors() {
  const MAX_FILE_SIZE = 15 * 1024 * 1024;

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });
  }

  function getImageDimensions(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('Не удалось загрузить изображение'));
      img.src = dataUrl;
    });
  }

  function isValidImageFile(file) {
    if (/^image\/(jpeg|png|webp)$/i.test(file.type || '')) return true;
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
  }

  function createBannerEditor(config) {
    const {
      bannersModule,
      modalId,
      modalDialogId,
      pickStepId,
      editStepId,
      editNumId,
      pickImageBtnId,
      removeImageBtnId,
      imageInputId,
      imagePreviewId,
      saveBtnId,
      cancelBtnId,
      backBtnId,
      modalCloseId,
      modalDragHandleId,
      successId,
      warningId,
      openFnName,
      onClose,
      hideGateOnOpen,
      maxFileSize: configMaxFileSize,
      draggable = true,
      pageMode = false,
      sectionKey = 'homeBanner',
      pageBackBtnId
    } = config;

    const modal = document.getElementById(modalId);
    const modalDialog = modalDialogId ? document.getElementById(modalDialogId) : null;
    const pickStep = document.getElementById(pickStepId);
    const editStep = document.getElementById(editStepId);
    const editNum = document.getElementById(editNumId);
    const pickImageBtn = document.getElementById(pickImageBtnId);
    const removeImageBtn = document.getElementById(removeImageBtnId);
    const imageInput = document.getElementById(imageInputId);
    const imagePreview = document.getElementById(imagePreviewId);
    const saveBtn = document.getElementById(saveBtnId);
    const cancelBtn = document.getElementById(cancelBtnId);
    const backBtn = document.getElementById(backBtnId);
    const modalClose = modalCloseId ? document.getElementById(modalCloseId) : null;
    const pageBackBtn = pageBackBtnId ? document.getElementById(pageBackBtnId) : null;
    const modalDragHandle = modalDragHandleId ? document.getElementById(modalDragHandleId) : null;
    const success = document.getElementById(successId);
    const warning = document.getElementById(warningId);

    if (!modal || !pickStep || !editStep || !bannersModule) return null;
    if (!pageMode && (!modalDialog || !modalClose)) return null;

    if (!pageMode && !draggable && modalDialog) {
      modalDialog.classList.add('admin-modal-banners--static');
    }

    const maxFileSize = configMaxFileSize
      || bannersModule.MAX_FILE_SIZE
      || MAX_FILE_SIZE;
    const maxFileSizeLabel = `${Math.round(maxFileSize / (1024 * 1024))} МБ`;

    const {
      SLIDE_GRADIENTS,
      DEFAULT_FIT,
      load: loadSlideData,
      remove: removeSlide,
      commitSlide,
      isRatioOk
    } = bannersModule;

    const RECOMMENDED = config.recommendedSize
      || bannersModule.CLOTHING_RECOMMENDED
      || bannersModule.FITNESS_RECOMMENDED
      || bannersModule.HERO_RECOMMENDED;

    let slideData = [null, null, null, null];
    let selectedSlide = 0;
    let pendingImageData = null;
    let removeImage = false;
    let isSaving = false;
    let modalOffset = { x: 0, y: 0 };
    let isDraggingModal = false;
    let modalDragStart = { x: 0, y: 0, offsetX: 0, offsetY: 0 };
    let modalWasMoved = false;

    async function saveSlideToServer(index, slide) {
      if (!slide?.image) {
        await removeSlide(slideData, index);
        return null;
      }

      return commitSlide(slideData, index, slide);
    }

    function showToast(message, type = 'success') {
      window.showAdminToast(message, type);
    }

    function showWarning(message) {
      if (!warning) return;
      warning.textContent = message;
      warning.hidden = !message;
    }

    function showSuccess(message) {
      if (!success) return;
      success.textContent = message;
      success.hidden = !message;
    }

    function resetModalPosition() {
      if (!draggable || !modalDialog) return;
      modalOffset = { x: 0, y: 0 };
      modalDialog.style.transform = '';
      modalDialog.classList.remove('is-dragging-window');
    }

    function applyModalTransform() {
      if (!draggable || !modalDialog) return;
      modalDialog.style.transform = `translate(${modalOffset.x}px, ${modalOffset.y}px)`;
    }

    function stopModalDragging() {
      if (!isDraggingModal) return;
      isDraggingModal = false;
      modalDialog?.classList.remove('is-dragging-window');
      window.removeEventListener('mousemove', onModalMouseMove);
      window.removeEventListener('mouseup', onModalMouseUp);
      window.removeEventListener('touchmove', onModalTouchMove);
      window.removeEventListener('touchend', onModalTouchEnd);
    }

    function onModalDragMove(clientX, clientY) {
      const dx = clientX - modalDragStart.x;
      const dy = clientY - modalDragStart.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) modalWasMoved = true;
      modalOffset.x = modalDragStart.offsetX + dx;
      modalOffset.y = modalDragStart.offsetY + dy;
      applyModalTransform();
    }

    function onModalMouseMove(e) {
      if (!isDraggingModal) return;
      e.preventDefault();
      onModalDragMove(e.clientX, e.clientY);
    }

    function onModalMouseUp() {
      stopModalDragging();
    }

    function onModalTouchMove(e) {
      if (!isDraggingModal || !e.touches[0]) return;
      e.preventDefault();
      onModalDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }

    function onModalTouchEnd() {
      stopModalDragging();
    }

    function startModalDragging(clientX, clientY) {
      if (!modalDialog) return;
      isDraggingModal = true;
      modalWasMoved = false;
      modalDragStart = {
        x: clientX,
        y: clientY,
        offsetX: modalOffset.x,
        offsetY: modalOffset.y
      };
      modalDialog.classList.add('is-dragging-window');
      window.addEventListener('mousemove', onModalMouseMove);
      window.addEventListener('mouseup', onModalMouseUp);
      window.addEventListener('touchmove', onModalTouchMove, { passive: false });
      window.addEventListener('touchend', onModalTouchEnd);
    }

    function setSavingState(saving) {
      isSaving = saving;
      if (saveBtn) {
        saveBtn.disabled = saving;
        saveBtn.textContent = saving ? 'Сохранение…' : 'Сохранить баннер';
      }
      if (pickImageBtn) pickImageBtn.disabled = saving;
      if (removeImageBtn) removeImageBtn.disabled = saving;
      if (cancelBtn) cancelBtn.disabled = saving;
    }

    function getPreviewUrl() {
      if (pendingImageData) return pendingImageData;
      const data = slideData[selectedSlide];
      if (!data?.image) return '';
      const base = data.image.split('?')[0];
      return `${base}?t=${Date.now()}`;
    }

    function updateImageUi() {
      const previewUrl = getPreviewUrl();
      const hasImage = Boolean(previewUrl) && !removeImage;

      if (imagePreview) {
        if (hasImage) {
          imagePreview.src = previewUrl;
          imagePreview.hidden = false;
        } else {
          imagePreview.removeAttribute('src');
          imagePreview.hidden = true;
        }
      }

      if (removeImageBtn) {
        const canRemove = Boolean(pendingImageData) || (Boolean(slideData[selectedSlide]?.image) && !removeImage);
        removeImageBtn.hidden = !canRemove;
      }
    }

    function resetEditState() {
      pendingImageData = null;
      removeImage = false;
      if (imageInput) imageInput.value = '';
      showWarning('');
      showSuccess('');
      updateImageUi();
      setSavingState(false);
    }

    function updatePickList() {
      pickStep.querySelectorAll('[data-pick]').forEach((btn) => {
        const index = Number(btn.dataset.pick);
        const data = slideData[index];
        const thumb = btn.querySelector('.admin-banner-pick-thumb');

        btn.classList.toggle('has-image', Boolean(data?.image));

        if (thumb) {
          if (data?.image) {
            thumb.style.backgroundImage = `url("${data.image.split('?')[0]}")`;
            thumb.style.backgroundSize = 'cover';
            thumb.style.backgroundPosition = 'center';
          } else {
            thumb.style.backgroundImage = SLIDE_GRADIENTS[index];
            thumb.style.backgroundSize = '';
            thumb.style.backgroundPosition = '';
          }
        }
      });
    }

    async function openModal() {
      if (hideGateOnOpen) {
        const gate = typeof hideGateOnOpen === 'string'
          ? document.getElementById(hideGateOnOpen)
          : hideGateOnOpen;
        if (gate) gate.hidden = true;
      }

      if (pageMode) {
        if (typeof window.showAdminSection === 'function') {
          window.showAdminSection(sectionKey);
        }
      } else {
        modal.hidden = false;
      }

      resetModalPosition();
      modalWasMoved = false;
      slideData = await loadSlideData();
      updatePickList();
      showPickStep();
    }

    function closeModal() {
      if (pageMode) {
        if (typeof window.showAdminSection === 'function') {
          window.showAdminSection('appearance');
        }
      } else {
        modal.hidden = true;
      }

      resetEditState();
      stopModalDragging();
      resetModalPosition();
      if (typeof onClose === 'function') onClose();
    }

    function syncPanelChrome() {
      if (!pageMode && !modalDialog?.classList.contains('admin-home-banner-panel')) return;
      if (pageMode && !modal.classList.contains('admin-section-home-banner')) return;

      const modalDesc = document.getElementById('adminBannerModalDesc');
      const layout = document.getElementById('adminBannerLayout');
      const isEdit = !editStep.hidden;

      if (backBtn) backBtn.hidden = !isEdit;

      if (modalDesc) {
        modalDesc.textContent = isEdit
          ? `Баннер ${selectedSlide + 1} · рекомендуемый размер 3840 × 1200 px`
          : 'Выберите слайд hero-баннера для замены изображения';
      }

      layout?.classList.toggle('is-editing', isEdit);
    }

    function showPickStep() {
      pickStep.hidden = false;
      editStep.hidden = true;
      resetEditState();
      updatePickList();
      syncPanelChrome();
    }

    function showEditStep(index) {
      selectedSlide = index;
      pickStep.hidden = true;
      editStep.hidden = false;
      if (editNum) editNum.textContent = String(index + 1);
      resetEditState();
      updateImageUi();
      syncPanelChrome();
    }

    async function saveBanner() {
      if (isSaving) return;

      const hasPending = Boolean(pendingImageData);

      if (!hasPending && !removeImage) {
        showToast('Нет изменений для сохранения', 'error');
        return;
      }

      setSavingState(true);
      showWarning('');
      showSuccess('');

      try {
        if (removeImage && !hasPending) {
          await saveSlideToServer(selectedSlide, null);
          showToast(`Баннер ${selectedSlide + 1} удалён`);
        } else if (hasPending) {
          const { width, height } = await getImageDimensions(pendingImageData);
          const slide = {
            image: pendingImageData,
            width,
            height,
            fit: { ...DEFAULT_FIT }
          };
          await saveSlideToServer(selectedSlide, slide);

          if (RECOMMENDED && isRatioOk && !isRatioOk(width, height)) {
            showWarning(
              `Загружено ${width}×${height} px — рекомендуется ${RECOMMENDED.width}×${RECOMMENDED.height} px`
            );
          }

          showSuccess(`Баннер ${selectedSlide + 1} сохранён`);
          showToast(`Баннер ${selectedSlide + 1} сохранён`);
        }

        pendingImageData = null;
        removeImage = false;
        if (imageInput) imageInput.value = '';
        slideData = await loadSlideData();
        updatePickList();
        updateImageUi();
      } catch (error) {
        if (error.message.includes('fetch')) {
          showToast('Сервер недоступен. Запустите Docker: docker compose up -d', 'error');
        } else {
          showToast(error.message || 'Не удалось сохранить баннер', 'error');
        }
      } finally {
        setSavingState(false);
      }
    }

    modalClose?.addEventListener('click', closeModal);
    pageBackBtn?.addEventListener('click', closeModal);

    if (!pageMode) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal && (!draggable || !modalWasMoved)) closeModal();
      });

      modalDialog?.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    if (draggable) {
      if (modalDragHandle) {
        modalDragHandle.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          startModalDragging(e.clientX, e.clientY);
        });

        modalDragHandle.addEventListener('touchstart', (e) => {
          if (!e.touches[0]) return;
          startModalDragging(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
      }

      modalDialog?.querySelectorAll('.admin-banner-edit-header').forEach((header) => {
        header.addEventListener('mousedown', (e) => {
          if (e.button !== 0 || e.target.closest('button, input, label, a')) return;
          e.preventDefault();
          startModalDragging(e.clientX, e.clientY);
        });

        header.addEventListener('touchstart', (e) => {
          if (!e.touches[0] || e.target.closest('button, input, label, a')) return;
          startModalDragging(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
      });
    }

    pickStep.addEventListener('click', (e) => {
      const pickBtn = e.target.closest('[data-pick]');
      if (!pickBtn) return;
      showEditStep(Number(pickBtn.dataset.pick));
    });

    backBtn?.addEventListener('click', showPickStep);
    cancelBtn?.addEventListener('click', showPickStep);
    pickImageBtn?.addEventListener('click', () => imageInput?.click());
    saveBtn?.addEventListener('click', saveBanner);

    removeImageBtn?.addEventListener('click', () => {
      pendingImageData = null;
      removeImage = true;
      if (imageInput) imageInput.value = '';
      updateImageUi();
    });

    imageInput?.addEventListener('change', async () => {
      const file = imageInput.files?.[0];
      if (!file) return;

      if (!isValidImageFile(file)) {
        showToast('Поддерживаются только JPG, PNG и WebP', 'error');
        imageInput.value = '';
        return;
      }

      if (file.size > maxFileSize) {
        showToast(`Файл слишком большой. Максимум — ${maxFileSizeLabel}`, 'error');
        imageInput.value = '';
        return;
      }

      try {
        pendingImageData = await readFileAsDataUrl(file);
        removeImage = false;
        updateImageUi();
      } catch (error) {
        showToast(error.message || 'Не удалось прочитать файл', 'error');
      }
    });

    const updatedEvent = bannersModule === window.HeroBanners
      ? 'hero-banners-updated'
      : bannersModule === window.FitnessBanners
        ? 'fitness-banners-updated'
        : 'clothing-banners-updated';

    window.addEventListener(updatedEvent, async () => {
      slideData = await loadSlideData();
      updatePickList();
      if (!editStep.hidden) updateImageUi();
    });

    if (openFnName) {
      window[openFnName] = openModal;
    }

    if (pageMode) {
      window.adminHomeBannerGoBack = () => {
        if (!editStep.hidden) {
          showPickStep();
          return;
        }
        closeModal();
      };
    }

    return { openModal, closeModal, showPickStep };
  }

  }
})();
