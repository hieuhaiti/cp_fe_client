// @ts-check

/**
 * 3 loại kịch bản ngập lụt chính
 * @typedef {'hien_trang' | 'cai_tao' | 'quy_hoach'} ScenarioTypeId
 * @typedef {'rcp45' | 'rcp85'} RcpOptionId
 */

export const SCENARIO_TYPES = {
  hien_trang: {
    id: 'hien_trang',
    label: 'Hiện trạng ngập lụt',
    shortLabel: 'Hiện trạng',
    description: 'Nguy cơ ngập lụt theo hiện trạng hạ tầng hiện hữu',
  },
  cai_tao: {
    id: 'cai_tao',
    label: 'Cải tạo thoát nước',
    shortLabel: 'Cải tạo thoát nước',
    description: 'Mô phỏng sau khi cải tạo hệ thống cống và trạm bơm',
  },
  quy_hoach: {
    id: 'quy_hoach',
    label: 'Quy hoạch 2050',
    shortLabel: 'Quy hoạch 2050',
    description: 'Dự báo ngập lụt 2050 kết hợp kịch bản biến đổi khí hậu',
  },
};

export const SCENARIO_TYPE_OPTIONS = [
  SCENARIO_TYPES.hien_trang,
  SCENARIO_TYPES.cai_tao,
  SCENARIO_TYPES.quy_hoach,
];

export const RCP_OPTIONS = {
  rcp45: {
    id: 'rcp45',
    label: 'Kịch bản RCP 4.5',
    shortLabel: 'RCP 4.5',
    description: 'Kịch bản phát thải trung bình',
  },
  rcp85: {
    id: 'rcp85',
    label: 'Kịch bản RCP 8.5',
    shortLabel: 'RCP 8.5',
    description: 'Kịch bản phát thải cao',
  },
};

export const RCP_OPTION_LIST = [
  RCP_OPTIONS.rcp45,
  RCP_OPTIONS.rcp85,
];
