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
      maxFileSize: configMaxFileSize
    } = config;

    const modal = document.getElementById(modalId);
    const modalDialog = document.getElementById(modalDialogId);
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
    const modalClose = document.getElementById(modalCloseId);
    const modalDragHandle = document.getElementById(modalDragHandleId);
    const success = document.getElementById(successId);
    const warning = document.getElementById(warningId);
    const toast = document.getElementById('adminToast');

    if (!modal || !modalDialog || !pickStep || !editStep || !bannersModule) return null;

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
      if (!toast) return;
      toast.textContent = message;
      toast.className = `admin-toast admin-toast--${type}`;
      toast.hidden = false;
      clearTimeout(showToast._timer);
      showToast._timer = setTimeout(() => {
        toast.hidden = true;
      }, 4500);
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
      modalOffset = { x: 0, y: 0 };
      modalDialog.style.transform = '';
      modalDialog.classList.remove('is-dragging-window');
    }

    function applyModalTransform() {
      modalDialog.style.transform = `translate(${modalOffset.x}px, ${modalOffset.y}px)`;
    }

    function stopModalDragging() {
      if (!isDraggingModal) return;
      isDraggingModal = false;
      modalDialog.classList.remove('is-dragging-window');
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

      slideData = await loadSlideData();
      resetModalPosition();
      modalWasMoved = false;
      modal.hidden = false;
      updatePickList();
      showPickStep();
    }

    function closeModal() {
      modal.hidden = true;
      resetEditState();
      stopModalDragging();
      resetModalPosition();
      if (typeof onClose === 'function') onClose();
    }

    function showPickStep() {
      pickStep.hidden = false;
      editStep.hidden = true;
      resetEditState();
      updatePickList();
    }

    function showEditStep(index) {
      selectedSlide = index;
      pickStep.hidden = true;
      editStep.hidden = false;
      if (editNum) editNum.textContent = String(index + 1);
      resetEditState();
      updateImageUi();
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

    modal.addEventListener('click', (e) => {
      if (e.target === modal && !modalWasMoved) closeModal();
    });

    modalDialog.addEventListener('click', (e) => {
      e.stopPropagation();
    });

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

    modalDialog.querySelectorAll('.admin-banner-edit-header').forEach((header) => {
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

    return { openModal, closeModal };
  }

  if (window.HeroBanners) {
    createBannerEditor({
      bannersModule: window.HeroBanners,
      modalId: 'adminBannerModal',
      modalDialogId: 'adminBannerModalDialog',
      pickStepId: 'adminBannerPickStep',
      editStepId: 'adminBannerEditStep',
      editNumId: 'adminBannerEditNum',
      pickImageBtnId: 'adminBannerPickImage',
      removeImageBtnId: 'adminBannerRemoveImage',
      imageInputId: 'adminBannerImageInput',
      imagePreviewId: 'adminBannerImagePreview',
      saveBtnId: 'adminBannerSaveBtn',
      cancelBtnId: 'adminBannerCancelBtn',
      backBtnId: 'adminBannerBack',
      modalCloseId: 'adminBannerModalClose',
      modalDragHandleId: 'adminBannerModalDrag',
      successId: 'adminHeroSuccess',
      warningId: 'adminHeroWarning',
      openFnName: 'openAdminHomeBannerModal',
      onClose() {
        if (window._bannerOpenedFromAppearance) {
          window._bannerOpenedFromAppearance = false;
          if (typeof window.openAdminAppearanceGate === 'function') {
            window.openAdminAppearanceGate();
          }
        }
      }
    });
  }

  if (window.FitnessBanners) {
    const fitnessEditor = createBannerEditor({
      bannersModule: window.FitnessBanners,
      modalId: 'adminFitnessBannerModal',
      modalDialogId: 'adminFitnessBannerModalDialog',
      pickStepId: 'adminFitnessBannerPickStep',
      editStepId: 'adminFitnessBannerEditStep',
      editNumId: 'adminFitnessBannerEditNum',
      pickImageBtnId: 'adminFitnessBannerPickImage',
      removeImageBtnId: 'adminFitnessBannerRemoveImage',
      imageInputId: 'adminFitnessBannerImageInput',
      imagePreviewId: 'adminFitnessBannerImagePreview',
      saveBtnId: 'adminFitnessBannerSaveBtn',
      cancelBtnId: 'adminFitnessBannerCancelBtn',
      backBtnId: 'adminFitnessBannerBack',
      modalCloseId: 'adminFitnessBannerModalClose',
      modalDragHandleId: 'adminFitnessBannerModalDrag',
      successId: 'adminFitnessHeroSuccess',
      warningId: 'adminFitnessHeroWarning',
      onClose() {
        if (typeof window.openAdminFitnessGate === 'function') {
          window.openAdminFitnessGate();
        }
      }
    });

    const chooseBannerBtn = document.getElementById('adminFitnessChooseBanner');
    chooseBannerBtn?.addEventListener('click', () => fitnessEditor?.openModal());
    window.openFitnessBannerEditor = () => fitnessEditor?.openModal();
  }

  if (window.ClothingBanners) {
    const clothingEditor = createBannerEditor({
      bannersModule: window.ClothingBanners,
      recommendedSize: window.ClothingBanners.CLOTHING_RECOMMENDED,
      maxFileSize: window.ClothingBanners.MAX_FILE_SIZE,
      modalId: 'adminClothingBannerModal',
      modalDialogId: 'adminClothingBannerModalDialog',
      pickStepId: 'adminClothingBannerPickStep',
      editStepId: 'adminClothingBannerEditStep',
      editNumId: 'adminClothingBannerEditNum',
      pickImageBtnId: 'adminClothingBannerPickImage',
      removeImageBtnId: 'adminClothingBannerRemoveImage',
      imageInputId: 'adminClothingBannerImageInput',
      imagePreviewId: 'adminClothingBannerImagePreview',
      saveBtnId: 'adminClothingBannerSaveBtn',
      cancelBtnId: 'adminClothingBannerCancelBtn',
      backBtnId: 'adminClothingBannerBack',
      modalCloseId: 'adminClothingBannerModalClose',
      modalDragHandleId: 'adminClothingBannerModalDrag',
      successId: 'adminClothingHeroSuccess',
      warningId: 'adminClothingHeroWarning',
      onClose() {
        if (typeof window.openAdminClothingGate === 'function') {
          window.openAdminClothingGate();
        }
      }
    });

    const chooseClothingBannerBtn = document.getElementById('adminClothingChooseBanner');
    const openClothingBannerModal = () => {
      const iconsModal = document.getElementById('adminClothingCatalogIconsModal');
      if (iconsModal) iconsModal.hidden = true;
      clothingEditor?.openModal();
    };
    chooseClothingBannerBtn?.addEventListener('click', openClothingBannerModal);
    window.openClothingBannerEditor = openClothingBannerModal;
  }
})();
