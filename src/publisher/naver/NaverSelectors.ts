/**
 * All Naver Blog DOM selectors live here so SmartEditor markup changes can be
 * fixed in one file without touching automation logic.
 * Each entry is an ordered candidate list: the first match wins.
 */
export const NaverUrls = {
  home: "https://www.naver.com",
  login: "https://nid.naver.com/nidlogin.login",
  blogHome: "https://blog.naver.com",
  write: (blogId: string) => `https://blog.naver.com/${blogId}?Redirect=Write&`,
  writeDirect: (blogId: string) => `https://blog.naver.com/PostWriteForm.naver?blogId=${blogId}`,
};

export const NaverSelectors = {
  /** Present only when logged out. */
  loggedOutMarkers: [
    "a.link_login",
    "#account .link_login",
    'a[href*="nid.naver.com/nidlogin.login"]',
  ],
  /** Present only when logged in. */
  loggedInMarkers: [
    ".MyView-module__link_login___HpHMW",
    "#account .MyView-module__my_area___jvxrW",
    'a[href*="nid.naver.com/nidlogin.logout"]',
    ".gnb_my",
  ],

  /** SmartEditor ONE lives inside this iframe on the blog write page. */
  editorFrames: ["iframe#mainFrame", "iframe[name='mainFrame']"],

  title: [
    ".se-documentTitle .se-text-paragraph",
    ".se-section-documentTitle .se-text-paragraph",
    "span.se-placeholder.__se_placeholder",
    "textarea.textarea_tit",
  ],

  body: [
    ".se-component.se-text .se-text-paragraph",
    ".se-section-text .se-text-paragraph",
    "div.se-content",
  ],

  /** Popups SmartEditor shows on entry (draft restore / help layer). */
  dismissPopups: [
    ".se-popup-button-cancel",
    "button.se-popup-button-cancel",
    ".se-help-panel-close-button",
    "button.se-help-panel-close-button",
    ".btn_close",
  ],

  imageButton: ["button.se-image-toolbar-button", "button[data-name='image']"],
  imageFileInput: ["input.se-image-file-input", "input[type='file'][accept*='image']"],

  publishOpen: ["button.publish_btn__m9KHH", "button.btn_publish", "button[data-click-area='tpb.publish']"],
  publishConfirm: [
    "button.confirm_btn__WEaBq",
    "button[data-testid='seOnePublishBtn']",
    ".layer_publish button.btn_apply",
  ],

  categorySelect: ["button.selectbox_button__jb1Dt", "button.btn_category", "#categoryList"],
  categoryOption: ".option_list__oe_UB li button",

  tagInput: ["input#tag-input.tag_input__rvUB5", "input.tag_input__rvUB5", "input[placeholder*='태그']"],

  openToPublic: ["input#open_public", "label[for='open_public']", "input[value='PUBLIC']"],
  openToPrivate: ["input#open_private", "label[for='open_private']", "input[value='PRIVATE']"],

  scheduleToggle: ["input#radio_time2", "label[for='radio_time2']"],
  scheduleDate: ["input.input_date__QmA0s", "input[name='date']"],
  scheduleHour: ["select.hour_option__J6qKb", "select[name='hour']"],
  scheduleMinute: ["select.minute_option__Vb3xB", "select[name='minute']"],
} as const;

export type SelectorList = readonly string[];
