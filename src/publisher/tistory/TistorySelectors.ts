/**
 * Tistory / Kakao DOM selectors. Isolated from automation logic so editor
 * markup updates only require edits here.
 */
export const TistoryUrls = {
  home: "https://www.tistory.com",
  login: "https://www.tistory.com/auth/login",
  kakaoLogin: "https://accounts.kakao.com/login",
  manage: (blog: string) => `https://${blog}.tistory.com/manage`,
  write: (blog: string) => `https://${blog}.tistory.com/manage/newpost/`,
};

export const TistorySelectors = {
  loggedOutMarkers: ['a[href*="/auth/login"]', ".btn_login", "a.link_login"],
  loggedInMarkers: ['a[href*="/auth/logout"]', ".link_profile", ".thumb_profile", "#kakaoHead .btn_my"],

  /** Kakao account login form (only used for the guided manual login). */
  kakaoEmail: ["input[name='loginId']", "#loginId--1", "input#id_email_2"],
  kakaoPassword: ["input[name='password']", "#password--2", "input#id_password_3"],
  kakaoSubmit: ["button.btn_g.highlight.submit", "button[type='submit']"],

  /** Draft-restore modal shown when a previous session left an autosave. */
  draftPopupCancel: [
    "#editor-mode-layer-btn-close",
    ".mce-window .mce-close",
    "button.btn_close",
    ".layer_post .btn_cancel",
  ],
  draftAlertDismiss: ["button.btn_cancel", ".mce-foot button:has-text('취소')"],

  title: ["#post-title-inp", "textarea#post-title-inp", "input#post-title-inp"],

  /** TinyMCE renders the body inside this iframe. */
  editorIframe: ["iframe#editor-tistory_ifr", "iframe.tox-edit-area__iframe", "iframe[id*='_ifr']"],
  editorBody: ["body#tinymce", "body.mce-content-body", "body[contenteditable='true']"],

  /** Tistory offers HTML mode, which lets us paste article markup directly. */
  modeButton: ["#editor-mode-layer-btn-open", "button#editor-mode-layer-btn-open"],
  modeHtml: ["#editor-mode-html", "a#editor-mode-html", "button#editor-mode-html"],
  modeHtmlConfirm: ["button.btn_lay.btn_g.confirm", ".mce-window button:has-text('확인')"],
  codeMirrorArea: [".CodeMirror textarea", "textarea.CodeMirror-line", ".CodeMirror"],

  imageButton: ["#mce_0-open", "button[aria-label='사진']", "button[title='사진']"],
  imageFileInput: ["input#attach-image", "input[type='file'][accept*='image']"],

  categoryButton: ["#category-btn", "button#category-btn"],
  categoryOption: "#category-list button, #category-list li button, .list_category button",

  tagInput: ["#tagText", "input#tagText", "input[placeholder*='태그']"],

  visibilityOpen: ["#open20", "label[for='open20']"],
  visibilityPrivate: ["#open0", "label[for='open0']"],
  scheduleRadio: ["#publish-reserve", "label[for='publish-reserve']"],
  scheduleDate: ["#dateInput", "input#dateInput"],
  scheduleTime: ["#timeInput", "input#timeInput"],

  publishLayerOpen: ["#publish-layer-btn", "button#publish-layer-btn"],
  publishConfirm: ["#publish-btn", "button#publish-btn"],
} as const;
