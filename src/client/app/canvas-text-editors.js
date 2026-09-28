  function textEditorScreenPoint(editor) {
    return { left: editor.x * state.scale + state.panX, top: editor.y * state.scale + state.panY };
  }
  function textEditorViewportSize() {
    const rect = view.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }
  function resizeTextEditorDimensions(gesture, hit, dx, dy, minWidth, minHeight, maxWidth, maxHeight) {
    const startWidth = gesture.startWidth,
      startHeight = gesture.startHeight,
      startFontCss = gesture.startFontCss,
      scale = Math.max(0.03, state.scale);
    let widthCss = startWidth,
      heightCss = startHeight,
      fontCss = startFontCss,
      x = gesture.startX,
      y = gesture.startY;
    const clampW = (value) => Math.max(minWidth, Math.min(maxWidth, value));
    const clampH = (value) => Math.max(minHeight, Math.min(maxHeight, value));
    const applyWest = (width) => { x = gesture.startX + (startWidth - width) / scale; };
    const applyNorth = (height) => { y = gesture.startY + (startHeight - height) / scale; };
    if (hit === "e" || hit === "width") {
      widthCss = clampW(startWidth + dx);
    } else if (hit === "w") {
      widthCss = clampW(startWidth - dx);
      applyWest(widthCss);
    } else if (hit === "s" || hit === "height") {
      heightCss = clampH(startHeight + dy);
    } else if (hit === "n") {
      heightCss = clampH(startHeight - dy);
      applyNorth(heightCss);
    } else {
      const sx = hit.includes("w") ? -1 : 1;
      widthCss = clampW(startWidth + sx * dx);
      if (hit.includes("w")) applyWest(widthCss);
      const factor = widthCss / Math.max(1, startWidth);
      fontCss = Math.max(16, Math.min(48, Math.round(startFontCss * factor)));
    }
    return { widthCss, heightCss, fontCss, x, y, autoHeight: true };
  }
  function keepTextEditorInsideCanvas(editor) {
    const logicalWidth = editor.widthCss / Math.max(0.03, state.scale),
      logicalHeight = editor.heightCss / Math.max(0.03, state.scale);
    editor.x = Math.max(0, Math.min(SIZE - logicalWidth, editor.x));
    editor.y = Math.max(0, Math.min(SIZE - logicalHeight, editor.y));
  }
  function keepTextEditorVisible(editor) {
    keepTextEditorInsideCanvas(editor);
  }
  function panToRevealTextEditor(editor) {
    if (!editor) return;
    const viewport = textEditorViewportSize(),
      pad = 16,
      point = textEditorScreenPoint(editor);
    let dx = 0,
      dy = 0;
    if (point.left < pad) dx = pad - point.left;
    else if (point.left + editor.widthCss > viewport.width - pad) dx = viewport.width - pad - (point.left + editor.widthCss);
    if (point.top < pad) dy = pad - point.top;
    else if (point.top + editor.heightCss > viewport.height - pad) dy = viewport.height - pad - (point.top + editor.heightCss);
    if (!dx && !dy) return;
    state.panX += dx;
    state.panY += dy;
    updateCoordinates();
    requestRender();
  }
  function positionTextEditors() {
    const visible = state.textEditors.size > 0;
    textEditorLayer.hidden = !visible;
    textInputHint.hidden = true;
    for (const editor of state.textEditors.values()) {
      keepTextEditorInsideCanvas(editor);
      const point = textEditorScreenPoint(editor),
        active = editor.id === state.activeTextEditorId,
        declaration = editor.styleRule?.["style"];
      const leftPx = `${Math.round(point.left)}px`,
        topPx = `${Math.round(point.top)}px`,
        widthPx = `${Math.round(editor.widthCss)}px`,
        heightPx = `${Math.round(editor.heightCss)}px`,
        zStr = String(editor.zIndex || 1),
        fontSize = `${editor.fontCss}px`,
        fontColor = editor.color || state.inkColor,
        fontFamily = state.aiFont || TEXT_EDITOR_FONT_FAMILY;
      // Direct inline style guarantees positioning regardless of stylesheet state
      editor.element.style.left = leftPx;
      editor.element.style.top = topPx;
      editor.element.style.width = widthPx;
      editor.element.style.height = heightPx;
      editor.element.style.zIndex = zStr;
      editor.element.style.setProperty("--text-editor-font-size", fontSize);
      editor.element.style.setProperty("--text-editor-ink", fontColor);
      editor.element.style.setProperty("--text-editor-font-family", fontFamily);
      if (editor.previewLogicalWidth) editor.element.style.setProperty("--text-editor-preview-width", `${editor.previewLogicalWidth}px`);
      else editor.element.style.removeProperty("--text-editor-preview-width");
      if (editor.previewLogicalHeight) editor.element.style.setProperty("--text-editor-preview-height", `${editor.previewLogicalHeight}px`);
      else editor.element.style.removeProperty("--text-editor-preview-height");
      if (declaration) {
        declaration.left = leftPx;
        declaration.top = topPx;
        declaration.width = widthPx;
        declaration.height = heightPx;
        declaration.zIndex = zStr;
        declaration.setProperty("--text-editor-font-size", fontSize);
        declaration.setProperty("--text-editor-ink", fontColor);
        declaration.setProperty("--text-editor-font-family", fontFamily);
        if (editor.previewLogicalWidth) declaration.setProperty("--text-editor-preview-width", `${editor.previewLogicalWidth}px`);
        else declaration.removeProperty("--text-editor-preview-width");
        if (editor.previewLogicalHeight) declaration.setProperty("--text-editor-preview-height", `${editor.previewLogicalHeight}px`);
        else declaration.removeProperty("--text-editor-preview-height");
      }
      editor.element.classList.toggle("active", active);
    }
    textEditorLayer.setAttribute("aria-hidden", String(!visible));
  }
  function textEditorStyleSheet() {
    if (state.textEditorStyleSheet) return state.textEditorStyleSheet;
    state.textEditorStyleSheet = [...document.styleSheets].find((sheet) => /(?:^|\/)(?:app|style)\.css(?:\?|$)/.test(sheet.href || "")) || null;
    return state.textEditorStyleSheet;
  }
  function addTextEditorStyleRule(editor) {
    const sheet = textEditorStyleSheet();
    if (!sheet) return;
    const className = `text-editor-instance-${editor.id}`;
    editor.element.classList.add(className);
    try {
      sheet.insertRule(`.${className} { left: 0px; top: 0px; width: ${Math.round(editor.widthCss)}px; height: ${Math.round(editor.heightCss)}px; }`, sheet.cssRules.length);
      editor.styleRule = [...sheet.cssRules].find((rule) => rule.selectorText === `.${className}`) || null;
    } catch {
      editor.styleRule = null;
    }
  }
  function removeTextEditorStyleRule(editor) {
    const rule = editor?.styleRule,
      sheet = textEditorStyleSheet();
    if (!rule || !sheet) return;
    const index = [...sheet.cssRules].indexOf(rule);
    if (index >= 0) {
      try { sheet.deleteRule(index); } catch {}
    }
    editor.styleRule = null;
  }
  function focusTextEditor(editor, input = false) {
    if (!editor) return;
    state.activeTextEditorId = editor.id;
    editor.zIndex = ++state.nextTextEditorZ;
    positionTextEditors();
    if (input && !editor.textarea.hidden) editor.textarea.focus({ preventScroll: true });
  }
  function textEditorPointerDown(event, editor, hit) {
    event.preventDefault();
    event.stopPropagation();
    focusTextEditor(editor, hit === "body");
    if (hit === "body") return;
    editor.gesture = {
      id: event.pointerId,
      hit,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: editor.x,
      startY: editor.y,
      startWidth: editor.widthCss,
      startHeight: editor.heightCss,
      startFontCss: editor.fontCss,
    };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
  }
  function updateTextEditorGesture(event, editor) {
    const gesture = editor.gesture;
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.startClientX,
      dy = event.clientY - gesture.startClientY,
      viewport = textEditorViewportSize();
    if (gesture.hit === "move") {
      editor.x = gesture.startX + dx / Math.max(0.03, state.scale);
      editor.y = gesture.startY + dy / Math.max(0.03, state.scale);
      editor.moved = true;
    } else {
      const point = textEditorScreenPoint(editor),
        maxWidth = Math.max(TEXT_EDITOR_MIN_WIDTH, viewport.width - Math.max(8, point.left) - 8),
        maxHeight = Math.max(TEXT_EDITOR_MIN_HEIGHT, viewport.height - Math.max(8, point.top) - 8),
        next = resizeTextEditorDimensions(gesture, gesture.hit, dx, dy, TEXT_EDITOR_MIN_WIDTH, TEXT_EDITOR_MIN_HEIGHT, maxWidth, maxHeight);
      editor.widthCss = next.widthCss;
      editor.heightCss = next.heightCss;
      editor.fontCss = next.fontCss;
      editor.x = next.x;
      editor.y = next.y;
      editor.resized = true;
      if (next.autoHeight) fitTextEditorToContent(editor);
      if (editor.mixedMode && (gesture.hit === "width" || gesture.hit === "e" || gesture.hit === "w" || gesture.hit === "corner" || /[ne]/.test(gesture.hit))) scheduleTextEditorPreview(editor);
    }
    positionTextEditors();
  }
  function finishTextEditorGesture(event, editor) {
    if (editor.gesture?.id !== event.pointerId) return;
    const hit = editor.gesture.hit;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
    editor.gesture = null;
    if (editor.mixedMode && (hit === "width" || hit === "corner")) scheduleTextEditorPreview(editor, 0);
  }
  function textEditorButton(button, key, className) {
    button.type = "button";
    button.className = `text-editor-button ${className || ""}`;
    button.dataset.i18nTitle = key;
    button.dataset.i18nAria = key;
    button.setAttribute("aria-label", t(key));
    button.setAttribute("title", t(key));
    if (className === "confirm") button.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4.5 10.3 3.4 3.4 7.8-8"/></svg>';
    else if (className === "cancel") button.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 5.5 14.5 14.5M14.5 5.5 5.5 14.5"/></svg>';
    else button.textContent = t(key);
    return button;
  }
  function removeTextEditor(editor) {
    if (!editor) return;
    editor.cancelled = true;
    cancelTextEditorPreview(editor, true);
    removeTextEditorStyleRule(editor);
    editor.element.remove();
    state.textEditors.delete(editor.id);
    if (state.activeTextEditorId === editor.id) {
      const next = state.textEditors.values().next().value || null;
      if (next) focusTextEditor(next);
      else state.activeTextEditorId = null;
    }
    positionTextEditors();
  }
  function clearTextEditors() {
    for (const editor of state.textEditors.values()) {
      editor.cancelled = true;
      cancelTextEditorPreview(editor, true);
      removeTextEditorStyleRule(editor);
      editor.element.remove();
    }
    state.textEditors.clear();
    state.activeTextEditorId = null;
    state.selectedTextBoxId = null;
    state.textTap = null;
    positionTextEditors();
  }
  function cancelTextEditorPreview(editor, clear = false) {
    if (!editor) return;
    clearTimeout(editor.previewTimer);
    editor.previewTimer = 0;
    editor.previewRevision++;
    if (!clear || !editor.preview) return;
    editor.preview.replaceChildren();
    editor.preview.removeAttribute("aria-busy");
    editor.preview.removeAttribute("data-fallback");
    editor.previewLogicalWidth = 0;
    editor.previewLogicalHeight = 0;
  }
  async function renderTextEditorPreview(editor) {
    if (!editor?.preview || !editor.mixedMode || editor.committing || editor.cancelled || state.textEditors.get(editor.id) !== editor) return;
    const revision = ++editor.previewRevision,
      text = editor.textarea.value,
      fontCss = editor.fontCss,
      maxWidth = Math.max(fontCss * 3, editor.widthCss - 16),
      color = editor.color || state.inkColor;
    editor.preview.setAttribute("aria-busy", "true");
    let image,
      fallback = false;
    try {
      image = await mixedTextImage(text, fontCss, color, maxWidth, 1.35, state.aiFont || TEXT_EDITOR_FONT_FAMILY, Math.min(3, devicePixelRatio || 1));
    } catch {
      image = textImage(text, fontCss, color, maxWidth, 1.35, state.aiFont || TEXT_EDITOR_FONT_FAMILY, TEXT_INPUT_MAX_LENGTH, Math.min(3, devicePixelRatio || 1));
      fallback = true;
    }
    if (editor.cancelled || editor.committing || !editor.mixedMode || editor.previewRevision !== revision || state.textEditors.get(editor.id) !== editor) return;
    image.classList.add("text-editor-preview-canvas");
    editor.previewLogicalWidth = image.logicalWidth || image.width;
    editor.previewLogicalHeight = image.logicalHeight || image.height;
    editor.preview.replaceChildren(image);
    editor.preview.toggleAttribute("data-fallback", fallback);
    editor.preview.setAttribute("aria-label", text || t("textPreview"));
    editor.preview.setAttribute("aria-busy", "false");
    positionTextEditors();
  }
  function scheduleTextEditorPreview(editor, delay = TEXT_EDITOR_PREVIEW_INTERVAL_MS) {
    if (!editor?.mixedMode || editor.committing || editor.cancelled) return;
    const effectiveDelay = delay > 0 ? Math.max(300, delay) : 0;
    if (effectiveDelay > 0 && editor.previewTimer) return;
    clearTimeout(editor.previewTimer);
    editor.previewTimer = setTimeout(() => {
      editor.previewTimer = 0;
      void renderTextEditorPreview(editor);
    }, effectiveDelay);
  }
  function updateTextEditorMixedMode(editor) {
    const button = editor?.mixedModeButton;
    if (!button) return;
    const labelKey = editor.mixedMode ? "textEditMode" : "textMixedMode";
    button.classList.toggle("active", editor.mixedMode);
    button.setAttribute("aria-pressed", String(editor.mixedMode));
    button.dataset.i18nTitle = labelKey;
    button.dataset.i18nAria = labelKey;
    button.setAttribute("aria-label", t(labelKey));
    button.setAttribute("title", t(labelKey));
    editor.element.classList.toggle("previewing", editor.mixedMode);
    if (editor.textarea) editor.textarea.hidden = Boolean(editor.mixedMode && editor.preview);
    if (editor.preview) editor.preview.hidden = !editor.mixedMode;
  }
  function toggleTextEditorMixedMode(editor) {
    if (!editor || editor.committing) return;
    editor.mixedMode = !editor.mixedMode;
    updateTextEditorMixedMode(editor);
    if (editor.mixedMode) {
      focusTextEditor(editor);
      scheduleTextEditorPreview(editor, 0);
      editor.preview?.focus({ preventScroll: true });
    } else {
      cancelTextEditorPreview(editor, true);
      focusTextEditor(editor, true);
    }
  }
  function openTextHelp(editor, invoker) {
    const dialog = document.querySelector("#textHelpDialog");
    if (!dialog) return;
    if (editor && state.textEditors.get(editor.id) === editor) focusTextEditor(editor);
    textHelpInvoker = invoker || null;
    if (!dialog.open) dialog.showModal();
  }
  function closeTextHelp() {
    const dialog = document.querySelector("#textHelpDialog");
    if (dialog?.open) dialog.close();
  }
  function restoreTextEditorAfterHelp() {
    blockCanvasInput(300);
    const invoker = textHelpInvoker;
    textHelpInvoker = null;
    if (invoker?.isConnected && !invoker.disabled) invoker.focus({ preventScroll: true });
  }
  function textEditorContentOffset() {
    return { x: 12, y: 10 };
  }
  function fitTextEditorToContent(editor) {
    const textarea = editor?.textarea;
    if (!textarea) return;
    textarea.style.height = "auto";
    const line = Math.ceil((editor.fontCss || TEXT_EDITOR_FONT_CSS) * 1.35);
    const scrollH = textarea.scrollHeight;
    const minCardH = Math.max(TEXT_EDITOR_MIN_HEIGHT, 100);
    const requiredAreaH = Math.max(56, scrollH);
    editor.heightCss = Math.max(minCardH, requiredAreaH + 44);
    textarea.style.height = `${requiredAreaH}px`;
    positionTextEditors();
  }

  async function confirmTextEditor(editor) {
    if (!editor) return;
    if (editor.commitPromise) return editor.commitPromise;
    const text = editor.textarea.value;
    if (!text.trim()) {
      setStatusKey("textEmpty");
      return;
    }
    const commitPromise = (async () => {
      editor.committing = true;
      editor.cancelled = false;
      editor.element.classList.add("committing");
      cancelTextEditorPreview(editor);
      blockCanvasInput(TEXT_INPUT_GUARD_MS);
      if (!editor.returnMode && state.mode === "text") setCanvasMode("pen");
      supersedeActiveAI("text-input-confirmed");
      clearTimeout(state.timer);
      state.timer = 0;
      editor.element.querySelectorAll("button").forEach((button) => (button.disabled = true));
      const contentOffset = textEditorContentOffset(editor),
        editorScale = Math.max(0.03, state.scale);
      editor.x += contentOffset.x / editorScale;
      editor.y += contentOffset.y / editorScale;
      editor.mixedMode = true;
      const proposedFontSize = editor.fontCss / Math.max(0.03, state.scale);
      let fontSize = editor.sourceTextBoxId && !editor.resized ? editor.sourceFontSize : proposedFontSize,
        proposedMaxWidth = Math.max(fontSize * 3, (editor.widthCss - 16) / Math.max(0.03, state.scale)),
        color = editor.color || state.inkColor;
      let maxWidth = editor.sourceTextBoxId && !editor.resized ? editor.sourceMaxWidth : proposedMaxWidth,
        x = editor.sourceTextBoxId && !editor.moved ? editor.sourceX : editor.x,
        y = editor.sourceTextBoxId && !editor.moved ? editor.sourceY : editor.y;
      const fitted = await fittedTextBoxContent(text, fontSize, color, maxWidth);
      if (editor.cancelled || state.textEditors.get(editor.id) !== editor) return;
      const image = fitted.image,
        mixedFallback = fitted.mixedFallback,
        width = fitted.width,
        height = fitted.height;
      fontSize = fitted.fontSize;
      maxWidth = fitted.maxWidth;
      x = Math.max(0, Math.min(SIZE - width, x));
      y = Math.max(0, Math.min(SIZE - height, y));
      const
        box = { x, y, w: width, h: height },
        existingIndex = editor.sourceTextBoxId ? state.textBoxes.findIndex((item) => item.id === editor.sourceTextBoxId) : -1;
      recordTextBoxesBefore();
      const item = {
        id:existingIndex >= 0 ? state.textBoxes[existingIndex].id : `text-box-${state.nextTextBoxId++}`,
        x,
        y,
        w:width,
        h:height,
        maxWidth,
        fontSize,
        color,
        text,
        image,
      };
      if (existingIndex >= 0) state.textBoxes.splice(existingIndex, 1, item);
      else state.textBoxes.push(item);
      state.userRevision++;
      mergeDirtyBox(box);
      state.latestTypedInput = { text: text.slice(0, TEXT_INPUT_MAX_LENGTH), box };
      state.hotspotTrail.push({ x: x + width / 2, y: y + height / 2 });
      if (state.hotspotTrail.length > 512) state.hotspotTrail.splice(0, state.hotspotTrail.length - 512);
      state.autoEligible = true;
      state.selectedTextBoxId = null;
      removeTextEditor(editor);
      blockCanvasInput(TEXT_INPUT_GUARD_MS);
      restoreTextEditorMode(editor);
      save();
      render();
      setStatusKey(mixedFallback ? "textMixedModeError" : "ready");
      if (state.auto) schedule(Math.max(1000, state.autoDelayMs));
    })();
    editor.commitPromise = commitPromise;
    try {
      return await commitPromise;
    } finally {
      if (editor.commitPromise === commitPromise) editor.commitPromise = null;
    }
  }
  function restoreTextEditorMode(editor) {
    const returnMode = editor?.returnMode;
    if (returnMode && state.mode === "hand") {
      setCanvasMode(returnMode, {
        preserveSelection:true,
        skipDraftFinalize:true,
        preserveWidgetRefinement:true,
      });
    } else if (!returnMode && state.mode === "text") setCanvasMode("pen");
  }
  function cancelTextEditor(editor) {
    if (!editor || editor.committing) return;
    if (editor.sourceTextBoxId) state.selectedTextBoxId = null;
    removeTextEditor(editor);
    blockCanvasInput(TEXT_INPUT_GUARD_MS);
    if (editor.returnMode) restoreTextEditorMode(editor);
    else setCanvasMode("pen");
    render();
    setStatusKey("ready");
    if (!state.textEditors.size && state.auto && state.autoEligible) schedule(Math.max(1000, state.autoDelayMs));
  }
  function deleteTextEditor(editor) {
    if (!editor || editor.committing) return;
    if (editor.sourceTextBoxId) {
      recordTextBoxesBefore();
      const idx = state.textBoxes.findIndex((item) => item.id === editor.sourceTextBoxId);
      if (idx >= 0) {
        const removed = state.textBoxes.splice(idx, 1)[0];
        mergeDirtyBox(removed);
        state.userRevision++;
        save();
      }
      state.selectedTextBoxId = null;
    }
    editor.cancelled = true;
    removeTextEditor(editor);
    blockCanvasInput(TEXT_INPUT_GUARD_MS);
    if (editor.returnMode) restoreTextEditorMode(editor);
    else setCanvasMode("pen");
    render();
    setStatusKey("ready");
  }
  function createTextEditor(point, options = null) {
    options ||= {};
    if (!options.sourceTextBoxId && state.textEditors.size) {
      for (const open of [...state.textEditors.values()]) void confirmTextEditor(open);
    }
    if (!options.sourceTextBoxId && state.textBoxes.length >= MAX_VISIBLE_TEXT_BOXES) return null;
    supersedeActiveAI("text-input-started");
    if (!state.timer && state.auto && state.dirty && state.autoEligible) schedule();
    const viewport = textEditorViewportSize(),
      widthCss = Math.min(Number(options.widthCss) || TEXT_EDITOR_DEFAULT_WIDTH, Math.max(TEXT_EDITOR_MIN_WIDTH, viewport.width - 24)),
      heightCss = Math.min(Number(options.heightCss) || TEXT_EDITOR_DEFAULT_HEIGHT, Math.max(TEXT_EDITOR_MIN_HEIGHT, viewport.height - 24)),
      editor = {
        id: state.nextTextEditorId++,
        x: point.x,
        y: point.y,
        widthCss,
        heightCss,
        fontCss: Number(options.fontCss) || TEXT_EDITOR_FONT_CSS,
        zIndex: 1,
        mixedMode: false,
        previewRevision: 0,
        previewTimer: 0,
        previewLogicalWidth: 0,
        previewLogicalHeight: 0,
        committing: false,
        cancelled: false,
        gesture: null,
        returnMode:typeof options.returnMode === "string" ? options.returnMode : "",
        sourceTextBoxId:typeof options.sourceTextBoxId === "string" ? options.sourceTextBoxId : "",
        sourceX:Number(options.sourceX),
        sourceY:Number(options.sourceY),
        sourceMaxWidth:Number(options.sourceMaxWidth),
        sourceFontSize:Number(options.sourceFontSize),
        moved:false,
        resized:false,
        color:typeof options.color === "string" ? options.color : state.inkColor,
      },
      root = document.createElement("section"),
      mixedModeButton = document.createElement("button"),
      textarea = document.createElement("textarea");
    editor.element = root;
    editor.textarea = textarea;
    editor.preview = null;
    editor.body = null;
    editor.mixedModeButton = mixedModeButton;
    root.className = "text-editor active";
    root.dataset.editorId = String(editor.id);
    root.dataset.i18nAria = "text";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", t("text"));
    mixedModeButton.hidden = true;
    textarea.className = "text-editor-input";
    textarea.rows = 1;
    textarea.maxLength = TEXT_INPUT_MAX_LENGTH;
    textarea.dataset.i18nPlaceholder = "textPlaceholder";
    textarea.dataset.i18nAria = "text";
    textarea.placeholder = t("textPlaceholder");
    textarea.setAttribute("aria-label", t("text"));
    textarea.value = typeof options.text === "string" ? options.text.slice(0, TEXT_INPUT_MAX_LENGTH) : "";
    const headerBar = document.createElement("div");
    headerBar.className = "text-editor-mini-bar";

    const titleSpan = document.createElement("span");
    titleSpan.className = "text-editor-title";
    titleSpan.innerHTML = '<svg viewBox="0 0 20 20" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H11v11a1 1 0 11-2 0V5H4a1 1 0 01-1-1z"/></svg><span>Text</span>';
    headerBar.append(titleSpan);

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "text-editor-actions";

    const eraseBtn = document.createElement("button");
    eraseBtn.type = "button";
    eraseBtn.className = "text-editor-erase-btn";
    eraseBtn.textContent = "Erase";
    eraseBtn.title = "Delete this text card";
    eraseBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    eraseBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      deleteTextEditor(editor);
    });
    actionsDiv.append(eraseBtn);

    const doneBtn = document.createElement("button");
    doneBtn.type = "button";
    doneBtn.className = "text-editor-done-btn";
    doneBtn.innerHTML = '<svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 11 8 15 16 6"/></svg><span>Done</span>';
    doneBtn.title = "Done (Confirm)";
    doneBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    doneBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void confirmTextEditor(editor);
    });
    actionsDiv.append(doneBtn);
    headerBar.append(actionsDiv);

    root.append(headerBar);
    root.append(textarea);
    for (const kind of ["ne", "se", "sw", "nw", "e", "w"]) {
      const handle = document.createElement("span");
      handle.className = `text-editor-handle ${kind}`;
      handle.dataset.textHandle = kind;
      root.append(handle);
      handle.addEventListener("pointerdown", (event) => textEditorPointerDown(event, editor, kind));
    }
    root.addEventListener("pointerdown", (event) => {
      if (event.target === textarea || event.target.closest(".text-editor-handle")) return;
      textEditorPointerDown(event, editor, "move");
    });
    root.addEventListener("pointermove", (event) => updateTextEditorGesture(event, editor));
    root.addEventListener("pointerup", (event) => finishTextEditorGesture(event, editor));
    root.addEventListener("pointercancel", (event) => finishTextEditorGesture(event, editor));
    textarea.addEventListener("focus", () => focusTextEditor(editor));
    textarea.addEventListener("input", () => {
      fitTextEditorToContent(editor);
      positionTextEditors();
    });
    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelTextEditor(editor);
      }
    });
    textarea.addEventListener("blur", () => {
      if (editor.committing || editor.cancelled || editor.gesture) return;
      window.setTimeout(() => {
        if (editor.cancelled || editor.committing || !state.textEditors.has(editor.id)) return;
        if (editor.element.contains(document.activeElement)) return;
        if (String(editor.textarea.value || "").trim()) void confirmTextEditor(editor);
        else cancelTextEditor(editor);
      }, 80);
    });
    textEditorLayer.append(root);
    addTextEditorStyleRule(editor);
    updateTextEditorMixedMode(editor);
    keepTextEditorInsideCanvas(editor);
    state.textEditors.set(editor.id, editor);
    fitTextEditorToContent(editor);
    keepTextEditorVisible(editor);
    panToRevealTextEditor(editor);
    focusTextEditor(editor, true);
    positionTextEditors();
    return editor;
  }
  function editTextBox(item) {
    if (state.mode !== "hand" || !item || !state.textBoxes.includes(item) || state.textEditors.size) return false;
    if (state.widgetEdit) acceptWidgetEdit();
    if (state.imageEdit) acceptImageEdit({ restoreMode:false });
    if (state.animationEdit) acceptAnimationEdit();
    state.selectedTextBoxId = item.id;
    const scale = Math.max(.03, state.scale),
      editor = createTextEditor({ x:item.x, y:item.y }, {
        text:item.text,
        widthCss:Math.max(TEXT_EDITOR_MIN_WIDTH, item.maxWidth * scale + 16),
        heightCss:Math.max(TEXT_EDITOR_MIN_HEIGHT, item.h * scale + 20),
        fontCss:Math.max(8, item.fontSize * scale),
        sourceTextBoxId:item.id,
        sourceX:item.x,
        sourceY:item.y,
        sourceMaxWidth:item.maxWidth,
        sourceFontSize:item.fontSize,
        color:item.color,
        returnMode:"hand",
      });
    if (!editor) {
      state.selectedTextBoxId = null;
      return false;
    }
    const offset = textEditorContentOffset(editor);
    editor.x -= offset.x / scale;
    editor.y -= offset.y / scale;
    positionTextEditors();
    setStatusKey("ready");
    render();
    return true;
  }
  function pendingReplyBox(itemIndex = null) {
    const pending = state.pending;
    if (!pending) return null;
    if (pending.items) {
      const item = Number.isInteger(itemIndex) ? pending.items[itemIndex] : pending.items.find((entry) => entry?.textCommand) || pending.items[pending.selectedIndex] || pending.items[0];
      return item ? pendingItemBounds(item) : null;
    }
    return draftBounds(pending);
  }
  function openBoardReplyFromPending(itemIndex = null) {
    const box = pendingReplyBox(itemIndex);
    if (!box) return false;
    const gap = 20 / Math.max(0.03, state.scale),
      point = {
        x: box.x,
        y: Math.min(SIZE - 80, box.y + box.h + gap),
      },
      editor = createTextEditor(point, {
        returnMode: state.mode === "text" ? "" : state.mode,
      });
    if (!editor) return false;
    panToRevealTextEditor(editor);
    positionTextEditors();
    setStatusKey("boardReplyHint");
    return true;
  }
  function setCanvasCursor(cursor) {
    screen.classList.remove("cursor-crosshair", "cursor-pen", "cursor-eraser", "cursor-grab", "cursor-grabbing", "cursor-nwse-resize", "cursor-ew-resize", "cursor-ns-resize");
    screen.classList.add(`cursor-${cursor}`);
  }
  function resetCanvasCursor() {
    setCanvasCursor(state.mode === "hand" ? "grab" : state.mode === "pen" || state.mode === "shape" ? "pen" : state.mode === "eraser" ? "eraser" : "crosshair");
  }
  function beginTouchGesture() {
    if (state.touches.size < 2) return;
    const ids = [...state.touches.keys()].slice(0, 2),
      points = ids.map((id) => state.touches.get(id));
    state.touchGesture = {
      ids,
      center: {
        x: (points[0].x + points[1].x) / 2,
        y: (points[0].y + points[1].y) / 2,
      },
      distance: Math.max(1, Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)),
      scale: state.scale,
      panX: state.panX,
      panY: state.panY,
    };
    state.panGesture = null;
  }
  function clampPan() {
    const r = view.getBoundingClientRect(),
      canvasW = SIZE * state.scale,
      canvasH = SIZE * state.scale,
      margin = Math.min(240, Math.min(r.width, r.height) * 0.3);
    if (canvasW <= r.width) {
      state.panX = (r.width - canvasW) / 2;
    } else {
      const minX = r.width - canvasW - margin,
        maxX = margin;
      state.panX = Math.min(maxX, Math.max(minX, state.panX));
    }
    if (canvasH <= r.height) {
      state.panY = (r.height - canvasH) / 2;
    } else {
      const minY = r.height - canvasH - margin,
        maxY = margin;
      state.panY = Math.min(maxY, Math.max(minY, state.panY));
    }
  }
  const MIN_CANVAS_SCALE = 0.05;
  const MAX_CANVAS_SCALE = 3.0;

  function updateTouchGesture() {
    const g = state.touchGesture;
    if (!g) return false;
    const points = g.ids.map((id) => state.touches.get(id));
    if (points.some((p) => !p)) return false;
    const center = {
        x: (points[0].x + points[1].x) / 2,
        y: (points[0].y + points[1].y) / 2,
      },
      distance = Math.max(1, Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)),
      r = view.getBoundingClientRect(),
      next = Math.max(MIN_CANVAS_SCALE, Math.min(MAX_CANVAS_SCALE, (g.scale * distance) / g.distance)),
      anchorX = (g.center.x - r.left - g.panX) / g.scale,
      anchorY = (g.center.y - r.top - g.panY) / g.scale;
    state.scale = next;
    state.panX = center.x - r.left - anchorX * next;
    state.panY = center.y - r.top - anchorY * next;
    clampPan();
    updateCoordinates();
    setNavigating(true);
    render();
    return true;
  }
  function moveCanvas(dx, dy) {
    state.panX += dx;
    state.panY += dy;
    clampPan();
    updateCoordinates();
    requestRender();
  }
  function zoomCanvasAt(clientX, clientY, deltaY) {
    const rect = view.getBoundingClientRect(),
      factor = deltaY < 0 ? 1.12 : 0.89,
      next = Math.max(MIN_CANVAS_SCALE, Math.min(MAX_CANVAS_SCALE, state.scale * factor)),
      px = clientX - rect.left,
      py = clientY - rect.top;
    state.panX = px - ((px - state.panX) * next) / state.scale;
    state.panY = py - ((py - state.panY) * next) / state.scale;
    state.scale = next;
    clampPan();
    updateCoordinates();
    requestRender();
    wheelNavigating();
  }

  function getAllContentBounds() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let found = false;
    for (const card of state.textBoxes || []) {
      if (typeof card.x === "number" && typeof card.y === "number") {
        minX = Math.min(minX, card.x);
        minY = Math.min(minY, card.y);
        maxX = Math.max(maxX, card.x + (card.w || 300));
        maxY = Math.max(maxY, card.y + (card.h || 150));
        found = true;
      }
    }
    for (const img of state.images || []) {
      if (typeof img.x === "number" && typeof img.y === "number") {
        minX = Math.min(minX, img.x);
        minY = Math.min(minY, img.y);
        maxX = Math.max(maxX, img.x + (img.w || 200));
        maxY = Math.max(maxY, img.y + (img.h || 200));
        found = true;
      }
    }
    if (state.inkBounds && state.inkBounds.size > 0) {
      for (const b of state.inkBounds.values()) {
        if (b && typeof b.minX === "number") {
          minX = Math.min(minX, b.minX);
          minY = Math.min(minY, b.minY);
          maxX = Math.max(maxX, b.maxX);
          maxY = Math.max(maxY, b.maxY);
          found = true;
        }
      }
    }
    if (!found) return null;
    return { x: minX, y: minY, w: Math.max(20, maxX - minX), h: Math.max(20, maxY - minY) };
  }

  function frameBounds(box, { duration = 280, padding = 80, maxScale = 1.25 } = {}) {
    if (!box || box.w <= 0 || box.h <= 0) return;
    const r = view.getBoundingClientRect();
    const availableW = Math.max(120, r.width - padding * 2);
    const availableH = Math.max(120, r.height - padding * 2);
    const targetScale = Math.max(MIN_CANVAS_SCALE, Math.min(maxScale, Math.min(availableW / box.w, availableH / box.h)));
    const centerX = box.x + box.w / 2;
    const centerY = box.y + box.h / 2;
    const targetPanX = (r.width / 2) - centerX * targetScale;
    const targetPanY = (r.height / 2) - centerY * targetScale;

    const startScale = state.scale;
    const startPanX = state.panX;
    const startPanY = state.panY;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      state.scale = startScale + (targetScale - startScale) * ease;
      state.panX = startPanX + (targetPanX - startPanX) * ease;
      state.panY = startPanY + (targetPanY - startPanY) * ease;
      clampPan();
      updateCoordinates();
      requestRender();
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  let cachedPreviousView = null;

  function clearSelectionFocus() {
    cachedPreviousView = null;
    window.isSelectionFocused = false;
  }

  function focusSelection() {
    const selection = state.selection;
    if (window.isSelectionFocused) {
      window.isSelectionFocused = false;
      const allBounds = getAllContentBounds();
      if (allBounds) {
        frameBounds(allBounds, { padding: 90, maxScale: 1.0 });
      } else if (cachedPreviousView) {
        const { scale, panX, panY } = cachedPreviousView;
        animateToView(scale, panX, panY);
      }
      cachedPreviousView = null;
      if (typeof updateSelectionToolbar === "function") updateSelectionToolbar();
      return;
    }
    if (selection?.box) {
      cachedPreviousView = { scale: state.scale, panX: state.panX, panY: state.panY };
      window.isSelectionFocused = true;
      frameBounds(selection.box, { padding: 80, maxScale: 1.25 });
      if (typeof updateSelectionToolbar === "function") updateSelectionToolbar();
    }
  }

  function animateToView(targetScale, targetPanX, targetPanY, { duration = 280 } = {}) {
    const startScale = state.scale;
    const startPanX = state.panX;
    const startPanY = state.panY;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      state.scale = startScale + (targetScale - startScale) * ease;
      state.panX = startPanX + (targetPanX - startPanX) * ease;
      state.panY = startPanY + (targetPanY - startPanY) * ease;
      clampPan();
      updateCoordinates();
      requestRender();
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  function frameContent() {
    const allBounds = getAllContentBounds() || state.selection?.box || state.lastUserBox || state.dirty;
    if (allBounds && allBounds.w > 0 && allBounds.h > 0) {
      frameBounds(allBounds, { padding: 90, maxScale: 1.0 });
    } else {
      const r = view.getBoundingClientRect();
      animateToView(1.0, 0, 0);
    }
  }

  function selectCardById(id) {
    const card = (state.textBoxes || []).find((c) => c.id === id);
    if (!card) return;
    state.selectedTextBoxId = card.id;
    state.selection = {
      phase: "active",
      originalBox: { x: card.x, y: card.y, w: card.w, h: card.h },
      box: { x: card.x, y: card.y, w: card.w, h: card.h },
      liftedTextBoxes: [card],
      fragments: [],
      beforeTiles: new Map(),
      color: null,
    };
    if (typeof updateSelectionToolbar === "function") updateSelectionToolbar();
    requestRender();
  }

  function navigateCards(direction = 1) {
    const cards = state.textBoxes || [];
    if (!cards.length) return;
    const currentId = state.selectedTextBoxId || (state.selection?.liftedTextBoxes?.[0]?.id);
    let currentIndex = cards.findIndex((c) => c.id === currentId);
    if (currentIndex < 0) {
      currentIndex = direction > 0 ? -1 : cards.length;
    }
    let nextIndex = currentIndex + direction;
    if (nextIndex >= cards.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = cards.length - 1;
    const targetCard = cards[nextIndex];
    if (!targetCard) return;

    selectCardById(targetCard.id);
    window.isSelectionFocused = true;
    frameBounds({ x: targetCard.x, y: targetCard.y, w: targetCard.w, h: targetCard.h }, { padding: 90, maxScale: 1.25 });
  }

  window.getAllContentBounds = getAllContentBounds;
  window.frameBounds = frameBounds;
  window.focusSelection = focusSelection;
  window.clearSelectionFocus = clearSelectionFocus;
  window.frameContent = frameContent;
  window.zoomCanvasAt = zoomCanvasAt;
  window.animateToView = animateToView;
  window.deleteTextEditor = deleteTextEditor;
  window.selectCardById = selectCardById;
  window.navigateCards = navigateCards;
  function valid(p) {
    return p.x >= 0 && p.x <= SIZE && p.y >= 0 && p.y <= SIZE;
  }
  function mergeDirty(x, y, p = 10) {
    const a = {
      x: Math.max(0, x - p),
      y: Math.max(0, y - p),
      w: Math.min(SIZE, x + p) - Math.max(0, x - p),
      h: Math.min(SIZE, y + p) - Math.max(0, y - p),
    };
    if (!state.dirty) state.dirty = a;
    else {
      const b = state.dirty,
        x1 = Math.min(a.x, b.x),
        y1 = Math.min(a.y, b.y),
        x2 = Math.max(a.x + a.w, b.x + b.w),
        y2 = Math.max(a.y + a.h, b.y + b.h);
      state.dirty = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }
  }
  function restoreDirty(box) {
    if (!box) return;
    if (!state.dirty) {
      state.dirty = box;
      return;
    }
    const x = Math.min(box.x, state.dirty.x),
      y = Math.min(box.y, state.dirty.y),
      right = Math.max(box.x + box.w, state.dirty.x + state.dirty.w),
      bottom = Math.max(box.y + box.h, state.dirty.y + state.dirty.h);
    state.dirty = { x, y, w: right - x, h: bottom - y };
  }
  function discardUncapturableInput(hotspotCount, usedDirty) {
    if (hotspotCount) state.hotspotTrail.splice(0, hotspotCount);
    state.dirty = null;
    state.autoEligible = false;
    if (!usedDirty) state.lastUserBox = null;
  }
  function invalidateRecognition() {
    const active=state.activeAI;
    if(active&&!active.superseded){active.superseded=true;active.dirtyRestored=true;active.controller.abort();if(state.activeAI===active){state.activeAI=null;setBusy(false)}}
    clearTimeout(state.timer);
    state.timer = 0;
    state.recognitionGeneration++;
    state.hotspotTrail = [];
    state.dirty = null;
    state.autoEligible = false;
    state.lastUserBox = null;
  }
  function cloneCanvas(source) {
    if (!source) return null;
    const copy = document.createElement("canvas");
    copy.width = copy.height = TILE;
    copy.getContext("2d").drawImage(source, 0, 0);
    return copy;
  }
