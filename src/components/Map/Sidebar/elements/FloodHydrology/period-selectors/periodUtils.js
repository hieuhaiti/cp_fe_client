import { format, parseISO, isValid, differenceInDays } from "date-fns";
import { vi } from "date-fns/locale";

/**
 * Lấy metadata của run một cách an toàn.
 */
export function runMetadata(run) {
  return run?.resultMetadata || run?.metadata || {};
}

/**
 * Chuẩn hóa ID thành chuỗi.
 */
export function normalizeId(value) {
  return value == null ? "" : String(value);
}

/**
 * Lấy ngày bắt đầu chính của run dưới dạng Date object và string YYYY-MM-DD.
 */
export function getRunDate(run) {
  const meta = runMetadata(run);
  const raw =
    meta.monitorStart ||
    meta.analysisPeriods?.[0]?.start ||
    run?.finishedAt ||
    run?.publishedAt ||
    run?.createdAt;

  if (!raw) {
    if (meta.analysisYear) {
      return {
        date: new Date(meta.analysisYear, 0, 1),
        dateStr: `${meta.analysisYear}-01-01`,
        year: meta.analysisYear,
        month: 1,
        day: 1,
        isYearOnly: true,
      };
    }
    return {
      date: new Date(),
      dateStr: format(new Date(), "yyyy-MM-dd"),
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      day: new Date().getDate(),
      isYearOnly: false,
    };
  }

  const parsed = typeof raw === "string" ? parseISO(raw) : new Date(raw);
  const valid = isValid(parsed);
  const safeDate = valid ? parsed : new Date();

  return {
    date: safeDate,
    dateStr: format(safeDate, "yyyy-MM-dd"),
    year: safeDate.getFullYear(),
    month: safeDate.getMonth() + 1,
    day: safeDate.getDate(),
    isYearOnly: false,
  };
}

/**
 * Lấy ngày kết thúc của run (nếu có kỳ kết thúc).
 */
export function getRunEndDate(run) {
  const meta = runMetadata(run);
  const raw =
    meta.monitorEnd ||
    meta.analysisPeriods?.[0]?.end ||
    meta.dryWindow?.end;

  if (!raw) return null;
  const parsed = typeof raw === "string" ? parseISO(raw) : new Date(raw);
  return isValid(parsed) ? parsed : null;
}

/**
 * Lấy diện tích ngập tóm tắt (ha).
 */
export function getFloodAreaHa(run) {
  const meta = runMetadata(run);
  const area = meta.areaStats?.floodExtentAreaHa;
  return Number.isFinite(Number(area)) ? Number(area) : null;
}

/**
 * Đánh giá mức độ nghiêm trọng của kỳ ngập dựa trên diện tích.
 */
export function getFloodSeverity(run) {
  const area = getFloodAreaHa(run);
  if (area == null) {
    return {
      level: "unknown",
      label: "Chưa có số liệu",
      dotClass: "bg-muted-foreground",
      badgeClass: "bg-muted text-muted-foreground border-border",
      textClass: "text-muted-foreground",
    };
  }
  if (area >= 50) {
    return {
      level: "high",
      label: `Ngập nặng (${area.toFixed(1)} ha)`,
      dotClass: "bg-destructive",
      badgeClass: "bg-destructive/15 text-destructive border-destructive/30",
      textClass: "text-destructive",
    };
  }
  if (area >= 15) {
    return {
      level: "medium",
      label: `Ngập vừa (${area.toFixed(1)} ha)`,
      dotClass: "bg-amber-500",
      badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
      textClass: "text-amber-600 dark:text-amber-400",
    };
  }
  return {
    level: "low",
    label: `Ngập nhẹ (${area.toFixed(1)} ha)`,
    dotClass: "bg-emerald-500",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    textClass: "text-emerald-600 dark:text-emerald-400",
  };
}

/**
 * Tạo nhãn đầy đủ cho run, phân biệt rõ các lần chạy cùng ngày.
 */
export function formatRunLabel(run, options = {}) {
  if (!run) return "Chưa chọn kỳ";
  const meta = runMetadata(run);
  const { date } = getRunDate(run);

  let datePart = "";
  if (meta.monitorStart) {
    datePart = meta.monitorEnd
      ? `${meta.monitorStart} – ${meta.monitorEnd}`
      : meta.monitorStart;
  } else if (meta.analysisYear) {
    datePart = `Năm ${meta.analysisYear}`;
  } else {
    datePart = format(date, "dd/MM/yyyy", { locale: vi });
  }

  const parts = [datePart];

  if (options.includeTime && run.finishedAt) {
    const finishDate = new Date(run.finishedAt);
    if (isValid(finishDate)) {
      parts.push(format(finishDate, "HH:mm"));
    }
  }

  if (options.includeArea) {
    const area = getFloodAreaHa(run);
    if (area != null) {
      parts.push(`${area.toFixed(1)} ha`);
    }
  }

  return parts.join(" · ");
}

/**
 * Gom nhóm danh sách runs theo Năm > Tháng.
 * Trả về mảng: [ { year: 2026, months: [ { month: 8, label: 'Tháng 08/2026', runs: [...] } ] } ]
 */
export function groupRunsByYearMonth(runs = []) {
  const yearsMap = new Map();

  runs.forEach((run) => {
    const { year, month } = getRunDate(run);
    if (!yearsMap.has(year)) {
      yearsMap.set(year, new Map());
    }
    const monthsMap = yearsMap.get(year);
    if (!monthsMap.has(month)) {
      monthsMap.set(month, []);
    }
    monthsMap.get(month).push(run);
  });

  const sortedYears = Array.from(yearsMap.keys()).sort((a, b) => b - a);

  return sortedYears.map((year) => {
    const monthsMap = yearsMap.get(year);
    const sortedMonths = Array.from(monthsMap.keys()).sort((a, b) => b - a);
    return {
      year,
      totalRuns: Array.from(monthsMap.values()).reduce((sum, r) => sum + r.length, 0),
      months: sortedMonths.map((month) => ({
        month,
        year,
        label: `Tháng ${String(month).padStart(2, "0")}/${year}`,
        runs: monthsMap.get(month),
      })),
    };
  });
}

/**
 * Gom nhóm các runs theo ngày chính xác (key: YYYY-MM-DD).
 */
export function groupRunsByDate(runs = []) {
  const map = new Map();
  runs.forEach((run) => {
    const { dateStr } = getRunDate(run);
    if (!map.has(dateStr)) {
      map.set(dateStr, []);
    }
    map.get(dateStr).push(run);
  });
  return map;
}

/**
 * Lọc danh sách runs nằm trong khoảng [startDateStr, endDateStr].
 */
export function filterRunsByDateRange(runs = [], startDateStr, endDateStr) {
  if (!startDateStr && !endDateStr) return runs;

  const start = startDateStr ? parseISO(startDateStr) : null;
  const end = endDateStr ? parseISO(endDateStr) : null;

  return runs.filter((run) => {
    const { date } = getRunDate(run);
    const endDate = getRunEndDate(run) || date;

    if (start && end) {
      return (
        (date >= start && date <= end) ||
        (endDate >= start && endDate <= end) ||
        (date <= start && endDate >= end)
      );
    }
    if (start) {
      return endDate >= start;
    }
    if (end) {
      return date <= end;
    }
    return true;
  });
}

/**
 * Tìm các kỳ gần nhất trước và sau khi một ngày/khoảng ngày không có dữ liệu.
 */
export function findNearestRuns(runs = [], targetDate, maxCount = 2) {
  if (!runs.length || !targetDate) return { before: [], after: [] };

  const target = typeof targetDate === "string" ? parseISO(targetDate) : targetDate;
  if (!isValid(target)) return { before: [], after: [] };

  const beforeList = [];
  const afterList = [];

  runs.forEach((run) => {
    const { date } = getRunDate(run);
    const diff = differenceInDays(date, target);
    if (diff < 0) {
      beforeList.push({ run, daysDiff: Math.abs(diff) });
    } else if (diff > 0) {
      afterList.push({ run, daysDiff: diff });
    }
  });

  beforeList.sort((a, b) => a.daysDiff - b.daysDiff);
  afterList.sort((a, b) => a.daysDiff - b.daysDiff);

  return {
    before: beforeList.slice(0, maxCount),
    after: afterList.slice(0, maxCount),
  };
}
