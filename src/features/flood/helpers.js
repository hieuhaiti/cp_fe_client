// @ts-check
import { SCENARIO_TYPES, RCP_OPTIONS } from './constants';

/**
 * Phân tích tên/mã kịch bản để nhận diện loại
 * @param {{ code?: string; name_vi?: string; type?: string; rcp?: string }} scenario
 * @returns {{ type: 'hien_trang' | 'cai_tao' | 'quy_hoach'; rcp?: 'rcp45' | 'rcp85' }}
 */
export function categorizeScenario(scenario) {
  if (scenario.type && SCENARIO_TYPES[scenario.type]) {
    // @ts-ignore
    return { type: scenario.type, rcp: scenario.rcp };
  }

  const text = `${scenario.code || ''} ${scenario.name_vi || ''}`.toLowerCase();

  if (text.includes('quy hoạch') || text.includes('quy hoach') || text.includes('2050') || text.includes('qh')) {
    const rcp = text.includes('8.5') || text.includes('85')
      ? 'rcp85'
      : text.includes('4.5') || text.includes('45')
      ? 'rcp45'
      : undefined;
    return { type: 'quy_hoach', rcp };
  }

  if (text.includes('cải tạo') || text.includes('cai tao') || text.includes('thoát nước')) {
    return { type: 'cai_tao' };
  }

  return { type: 'hien_trang' };
}

/**
 * Lọc danh sách kịch bản theo loại và RCP
 * @param {Array<any>} scenarios
 * @param {'hien_trang' | 'cai_tao' | 'quy_hoach'} selectedType
 * @param {'rcp45' | 'rcp85' | null} [selectedRcp]
 * @returns {Array<any>}
 */
export function filterScenariosByType(scenarios, selectedType, selectedRcp = null) {
  if (!Array.isArray(scenarios)) return [];

  return scenarios.filter((item) => {
    const { type, rcp } = categorizeScenario(item);
    if (type !== selectedType) return false;
    if (selectedType === 'quy_hoach' && selectedRcp) {
      if (rcp && rcp !== selectedRcp) return false;
    }
    return true;
  });
}

/**
 * Định dạng dải lượng mưa
 * @param {number | string | null | undefined} min
 * @param {number | string | null | undefined} max
 * @returns {string}
 */
export function formatRainfallRange(min, max) {
  if (min == null && max == null) return 'Không giới hạn';
  if (min == null) return `≤ ${parseFloat(String(max))} mm`;
  if (max == null) return `≥ ${parseFloat(String(min))} mm`;
  return `${parseFloat(String(min))} – ${parseFloat(String(max))} mm`;
}

/**
 * Định dạng dải mực nước triều
 * @param {number | string | null | undefined} min
 * @param {number | string | null | undefined} max
 * @returns {string | null}
 */
export function formatTideRange(min, max) {
  if (min == null && max == null) return null;
  if (min == null) return `≤ ${parseFloat(String(max))} m`;
  if (max == null) return `≥ ${parseFloat(String(min))} m`;
  return `${parseFloat(String(min))} – ${parseFloat(String(max))} m`;
}
