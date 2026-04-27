// components/Calendar.js
import PrimaryButton from '@/components/PrimaryButton';
import Colors from '@/theme/colors';
import { useLayoutTokens } from '@/ui/layout';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

const hexToRgba = (hex, alpha = 1) => {
  const h = (hex || '').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function pad2(n) {
  const x = String(n);
  return x.length === 1 ? `0${x}` : x;
}

function isoFromYM(year, monthIndex0, day = 1) {
  return `${year}-${pad2(monthIndex0 + 1)}-${pad2(day)}`;
}

function parseDDMMYYYY(value) {
  const [dd, mm, yyyy] = String(value || '').split('-');
  if (!dd || !mm || !yyyy) return null;
  return { dd: Number(dd), mm: Number(mm), yyyy: Number(yyyy) };
}

function PickerSheet({
  visible,
  title,
  items,
  selectedValue,
  onSelect,
  onClose,
  ui,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={pickerStyles.root}>
        <Pressable
          style={[pickerStyles.overlay, { backgroundColor: hexToRgba(Colors.black, 0.45) }]}
          onPress={onClose}
        />
        <View
          style={[
            pickerStyles.sheet,
            {
              borderRadius: ui.radius,
              marginHorizontal: ui.gutter,
              marginBottom: clamp(ui.H * 0.02, 10, 16),
              backgroundColor: Colors.background,
              borderColor: hexToRgba(Colors.black, 0.06),
            },
          ]}
        >
          <View
            style={{
              paddingHorizontal: ui.gutter,
              paddingTop: clamp(ui.H * 0.018, 10, 14),
              paddingBottom: clamp(ui.H * 0.012, 8, 12),
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: hexToRgba(Colors.black, 0.08),
            }}
          >
            <Text
              style={{
                color: Colors.textPrimary,
                fontWeight: '800',
                fontSize: clamp(ui.W * 0.042, 14, 16),
              }}
            >
              {title}
            </Text>
          </View>

          <ScrollView
            style={{ maxHeight: clamp(ui.H * 0.42, 240, 360) }}
            contentContainerStyle={{ paddingVertical: clamp(ui.H * 0.012, 8, 12) }}
            showsVerticalScrollIndicator={false}
          >
            {items.map((it) => {
              const isActive = it.value === selectedValue;
              return (
                <Pressable
                  key={String(it.value)}
                  onPress={() => {
                    onSelect?.(it.value);
                    onClose?.();
                  }}
                  style={({ pressed }) => [
                    {
                      marginHorizontal: ui.gutter,
                      paddingVertical: clamp(ui.H * 0.014, 10, 14),
                      paddingHorizontal: clamp(ui.W * 0.04, 14, 18),
                      borderRadius: clamp(ui.radius * 0.6, 12, 18),
                      backgroundColor: isActive
                        ? hexToRgba(Colors.primaryPink, 0.14)
                        : pressed
                        ? hexToRgba(Colors.black, 0.04)
                        : 'transparent',
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: isActive
                        ? hexToRgba(Colors.primaryPink, 0.35)
                        : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isActive ? Colors.primaryPink : Colors.textPrimary,
                      fontWeight: isActive ? '900' : '700',
                      fontSize: clamp(ui.W * 0.04, 13, 15),
                    }}
                  >
                    {it.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject },
  sheet: {
    width: 'auto',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default function PinkCalendarModal({
  visible,
  selectedDate: parentSelectedDate,
  onClose,
  onSelectDate,
}) {
  const t = useLayoutTokens() || {};
  const insets = useSafeAreaInsets();

  const [tempDate, setTempDate] = useState(null);

  // ✅ measure body height to avoid extra whitespace
  const [bodyH, setBodyH] = useState(0);

  // ✅ Month / Year dropdown state
  const [monthOpen, setMonthOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(new Date().getMonth()); // 0-11
  const [displayYear, setDisplayYear] = useState(new Date().getFullYear()); // YYYY

  useEffect(() => {
    if (!visible) return;

    setBodyH(0); // ✅ re-measure every open

    const now = new Date();
    let initY = now.getFullYear();
    let initM = now.getMonth();

    if (parentSelectedDate) {
      const parsed = parseDDMMYYYY(parentSelectedDate);
      if (parsed?.yyyy && parsed?.mm) {
        initY = parsed.yyyy;
        initM = Math.max(0, Math.min(11, parsed.mm - 1));
        setTempDate(`${parsed.yyyy}-${pad2(parsed.mm)}-${pad2(parsed.dd)}`);
      } else {
        setTempDate(null);
      }
    } else {
      setTempDate(null);
    }

    setDisplayYear(initY);
    setDisplayMonth(initM);
  }, [visible, parentSelectedDate]);

  const ui = useMemo(() => {
    const W = t?.W ?? 375;
    const H = t?.H ?? 812;
    const short = t?.short ?? Math.min(W, H);

    const gutter = clamp(t?.gutter ?? t?.pad ?? W * 0.05, 16, 24);
    const btnH = clamp(H * 0.055, 42, 48);

    const rawRadius = clamp(short * 0.05, 18, 28);
    const radius = Math.round(rawRadius / 8) * 8;

    // ✅ tight footer (ignores big iPhone safe-area padding)
    const padBottom = 30;

    // tiny top padding to look neat
    const padTop = clamp(H * 0.02, 10, 16);

    // gap between calendar and button
    const gap = clamp(H * 0.012, 8, 14);

    // ✅ maximum sheet height so it never goes too big
    const maxSheetH = clamp(H * 0.84, H * 0.70, H * 0.92);

    return {
      W,
      H,
      gutter,
      btnH,
      radius,
      padBottom,
      padTop,
      gap,
      maxSheetH,
      dayFont: clamp(W * 0.038, 12, 14.5),
      monthFont: clamp(W * 0.045, 14, 16.5),
      dayHeaderFont: clamp(W * 0.032, 11, 12.5),
      selectedRadius: clamp(short * 0.03, 10, 14),
      overlayAlpha: 0.4,

      // dropdown sizing
      dropH: clamp(H * 0.052, 40, 48),
      dropRadius: clamp(short * 0.03, 12, 16),
      dropFont: clamp(W * 0.038, 12.5, 14.5),
      dropGap: clamp(W * 0.03, 10, 14),
      dropIcon: clamp(W * 0.04, 14, 16),
    };
  }, [t, insets.bottom]);

  // ✅ CHANGE: year list starts at 2005
  const years = useMemo(() => {
    const base = new Date().getFullYear();
    const start = 2005;
    const end = base + 40; // keep rest same behavior (future range)
    const out = [];
    for (let y = start; y <= end; y++) out.push(y);
    return out;
  }, []);

  const monthItems = useMemo(
    () => MONTHS.map((m, idx) => ({ label: m, value: idx })),
    []
  );

  const yearItems = useMemo(
    () => years.map((y) => ({ label: String(y), value: y })),
    [years]
  );

  const currentISO = useMemo(() => isoFromYM(displayYear, displayMonth, 1), [displayYear, displayMonth]);
  const calendarKey = useMemo(() => `${displayYear}-${displayMonth}`, [displayYear, displayMonth]);

  const handleDayPress = (day) => {
    const ds = day?.dateString || null;
    setTempDate(ds);

    // ✅ if user taps a day from another month (rare with hidden arrows), keep dropdown in sync
    if (ds) {
      const [yy, mm] = String(ds).split('-');
      const y = Number(yy);
      const m = Number(mm);
      if (y && m) {
        setDisplayYear(y);
        setDisplayMonth(Math.max(0, Math.min(11, m - 1)));
      }
    }
  };

  const handleSave = () => {
    if (tempDate) {
      const [year, month, date] = String(tempDate).split('-');
      if (year && month && date) onSelectDate?.(`${date}-${month}-${year}`);
    }
    onClose?.();
  };

  // ✅ Required height = measured calendar body + footer + paddings
  const sheetH = useMemo(() => {
    const footerH = ui.gap + ui.btnH + ui.padBottom;
    const desired = ui.padTop + bodyH + footerH;

    const fallback = clamp(ui.H * 0.62, ui.H * 0.52, ui.H * 0.72);

    const raw = bodyH > 0 ? desired : fallback;
    return Math.min(ui.maxSheetH, Math.max(raw, ui.btnH + ui.padBottom + ui.padTop + 220));
  }, [bodyH, ui]);

  const Drop = ({ label, onPress, flex = 1 }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex,
          height: ui.dropH,
          borderRadius: ui.dropRadius,
          paddingHorizontal: clamp(ui.W * 0.035, 12, 16),
          justifyContent: 'center',
          backgroundColor: pressed ? hexToRgba(Colors.black, 0.03) : hexToRgba(Colors.black, 0.02),
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: hexToRgba(Colors.black, 0.08),
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text
          numberOfLines={1}
          style={{
            color: Colors.textPrimary,
            fontWeight: '800',
            fontSize: ui.dropFont,
            maxWidth: '90%',
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: Colors.primaryPink,
            fontWeight: '900',
            fontSize: ui.dropIcon,
            marginLeft: 10,
            lineHeight: ui.dropIcon + 2,
          }}
        >
          ▾
        </Text>
      </View>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={[styles.overlay, { backgroundColor: hexToRgba(Colors.black, ui.overlayAlpha) }]}
          onPress={onClose}
        />

        {/* ✅ Bottom sheet only as tall as needed */}
        <View
          style={[
            styles.sheet,
            {
              height: sheetH,
              borderTopLeftRadius: ui.radius,
              borderTopRightRadius: ui.radius,
              backgroundColor: Colors.background,
            },
          ]}
        >
          {/* ✅ BODY measures its own height */}
          <View
            style={{ paddingTop: ui.padTop, paddingHorizontal: ui.gutter }}
            onLayout={(e) => {
              const h = Math.round(e.nativeEvent.layout.height);
              if (h && Math.abs(h - bodyH) > 2) setBodyH(h);
            }}
          >
            {/* ✅ Theme-matched Month/Year dropdown row */}
            <View
              style={{
                flexDirection: 'row',
                gap: ui.dropGap,
                marginBottom: clamp(ui.H * 0.012, 8, 12),
              }}
            >
              <Drop label={MONTHS[displayMonth]} onPress={() => setMonthOpen(true)} />
              <Drop label={String(displayYear)} onPress={() => setYearOpen(true)} flex={0.62} />
            </View>

            <Calendar
              key={calendarKey} // ✅ force update when month/year changes
              current={currentISO}
              markingType="custom"
              onDayPress={handleDayPress}
              markedDates={
                tempDate
                  ? {
                      [tempDate]: {
                        customStyles: {
                          container: {
                            backgroundColor: Colors.primaryPink,
                            borderRadius: ui.selectedRadius,
                          },
                          text: { color: Colors.white, fontWeight: '800' },
                        },
                      },
                    }
                  : {}
              }
              // ✅ keep calendar clean since we provide dropdowns
              hideArrows
              renderHeader={() => null}
              theme={{
                calendarBackground: 'transparent',
                dayTextColor: Colors.textPrimary,
                monthTextColor: Colors.textPrimary,
                textSectionTitleColor: Colors.textSecondary,
                todayTextColor: Colors.textPrimary,
                arrowColor: Colors.primaryPink,
                textMonthFontWeight: '800',
                textDayFontSize: ui.dayFont,
                textMonthFontSize: ui.monthFont,
                textDayHeaderFontSize: ui.dayHeaderFont,
              }}
            />
          </View>

          <View
            style={{
              marginTop: ui.gap,
              paddingHorizontal: ui.gutter,
              paddingBottom: ui.padBottom,
            }}
          >
            <PrimaryButton
              title="SAVE YOUR DATE"
              onPress={handleSave}
              enabled={!!tempDate}
              height={ui.btnH}
            />
          </View>
        </View>

        {/* ✅ Month picker */}
        <PickerSheet
          visible={monthOpen}
          title="Select Month"
          items={monthItems}
          selectedValue={displayMonth}
          onSelect={(m) => setDisplayMonth(m)}
          onClose={() => setMonthOpen(false)}
          ui={ui}
        />

        {/* ✅ Year picker */}
        <PickerSheet
          visible={yearOpen}
          title="Select Year"
          items={yearItems}
          selectedValue={displayYear}
          onSelect={(y) => setDisplayYear(y)}
          onClose={() => setYearOpen(false)}
          ui={ui}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject },
  sheet: {
    width: '100%',
    overflow: 'hidden',
  },
});