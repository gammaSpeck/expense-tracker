# Analysis Page Redesign - Implementation Plan

## Overview

Redesign the Analysis page with a mobile-first approach, focusing on simplified default view with progressive disclosure for advanced features.

---

## Design Principles

- **Mobile-First**: Optimize layout and interactions for mobile screens
- **Context-Driven**: All data below period selector is based on selected time period
- **Progressive Disclosure**: Simple by default, complex on demand
- **Visual Hierarchy**: Most important information (Category Breakdown) at the top

---

## Layout Structure (Mobile View Priority)

### 1. **Period Selector Section** (Top)

**Position**: Very top of the page, below header

**Components**:

- Tab selector: `Week | Month | Year | Custom`
- Period navigation:
  - Left arrow (chevron-left)
  - Period display (center, bold)
  - Right arrow (chevron-right)
- Exclude Adhoc toggle (inline, below navigation)

**Display Formats**:

- **Week Tab**: `Feb 3 - Feb 9` (date range)
- **Month Tab**: `Feb 2026` (short month + year)
- **Year Tab**: `2026` (year only)
- **Custom Tab**: `Feb 3 - Feb 9` (or selected range)

**Behaviors**:

- Switching tabs resets to current period (current week/month/year)
- Arrows cycle through periods (week by week, month by month, year by year)
- Custom tab shows date range pickers below the navigation
- All data below updates based on selected period + adhoc filter

---

### 2. **Category Breakdown Section** (Primary Focus)

**Position**: Immediately below period selector

**Components**:

- Section title: "Category Breakdown"
- Donut/Pie chart (same size as current)
- Legend list showing ALL non-zero categories

**Chart Details**:

- Use category hex colors from database
- Inner radius for donut effect
- Percentage labels on segments
- Responsive container (h-64)

**Legend Format** (Below chart):

```
[Icon] Category Name     ₹XXX.XX    XX.X%
[Icon] Category Name     ₹XXX.XX    XX.X%
...
```

- Show category icon (same as used throughout app)
- Category name
- Total amount with currency
- Percentage of total

**Responsive Behavior**:

- Mobile: Single column, scrollable if 20+ categories
- Desktop: Multi-column grid (2-3 columns) to reduce vertical length

**Filtering**:

- Only show categories with non-zero totals for selected period

---

### 3. **Summary Statistics Section**

**Position**: Below Category Breakdown

**Components** (4 cards in 2x2 grid on mobile, 4 columns on desktop):

1. **Total**: Wallet icon + total expenses amount
2. **Transactions**: Receipt icon + transaction count
3. **Average**: TrendingUp icon + average per transaction
4. **Top Category**: Award icon + category icon + category name

**Layout**:

- Keep current card design (rounded-xl, border)
- Mobile: `grid-cols-2`
- Desktop: `grid-cols-4`

---

### 4. **Spending Trend Section**

**Position**: Below Summary Statistics

**Header**:

- Left side: "Spending Trend" title
- Right side: Granularity dropdown (small, compact)

**Granularity Options** (dynamic based on parent tab):

- **Week Tab**: Only "Day" (no dropdown needed, always daily)
- **Month Tab**: Dropdown with "Day | Week"
- **Year Tab**: Dropdown with "Day | Week | Month"
- **Custom Tab**: Dropdown with "Day | Week | Month" (smart based on range length)

**Chart Display**:

- Bar chart (current design maintained)
- X-axis labels adjust based on granularity:
  - Day: "MMM d" (Feb 3, Feb 4, etc.)
  - Week: "Week 1", "Week 2", etc. or "Feb 3-9", "Feb 10-16"
  - Month: "Jan", "Feb", "Mar", etc.
- Y-axis: Amount with currency symbol
- Responsive container (h-64)

---

### 5. **Export Section** (Bottom)

**Position**: Bottom of page

**Components**:

- Single "Export" button (outline variant)
- Opens dialog with CSV/JSON options (keep current implementation)

---

## State Management Changes

### New State Variables Needed:

```typescript
// Period navigation
const [periodTab, setPeriodTab] = useState<
  "week" | "month" | "year" | "custom"
>("month");
const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Anchor date for navigation
const [customRange, setCustomRange] = useState<DateRange | undefined>();

// Filters
const [excludeAdhoc, setExcludeAdhoc] = useState(true);

// Spending trend granularity
const [trendGranularity, setTrendGranularity] = useState<
  "day" | "week" | "month"
>("day");
```

### Computed Values:

```typescript
// Calculate actual date range based on periodTab + selectedDate
const dateRange = useMemo(() => {
  switch (periodTab) {
    case "week":
      return getWeekRange(selectedDate);
    case "month":
      return getMonthRange(selectedDate);
    case "year":
      return getYearRange(selectedDate);
    case "custom":
      return customRange || getMonthRange(selectedDate);
  }
}, [periodTab, selectedDate, customRange]);

// Format period display string
const periodDisplay = useMemo(() => {
  switch (periodTab) {
    case "week":
      return formatWeekRange(dateRange);
    case "month":
      return format(selectedDate, "MMM yyyy");
    case "year":
      return format(selectedDate, "yyyy");
    case "custom":
      return formatCustomRange(customRange);
  }
}, [periodTab, selectedDate, customRange, dateRange]);

// Available granularity options for spending trend
const granularityOptions = useMemo(() => {
  switch (periodTab) {
    case "week":
      return ["day"];
    case "month":
      return ["day", "week"];
    case "year":
      return ["day", "week", "month"];
    case "custom":
      return determineCustomGranularities(customRange);
  }
}, [periodTab, customRange]);
```

---

## Helper Functions to Create

### Date Range Utilities:

```typescript
// Get week range (Mon-Sun or locale-based)
function getWeekRange(date: Date): DateRange {
  // Implementation: startOfWeek, endOfWeek from date-fns
}

// Get month range
function getMonthRange(date: Date): DateRange {
  // Implementation: startOfMonth, endOfMonth
}

// Get year range
function getYearRange(date: Date): DateRange {
  // Implementation: startOfYear, endOfYear
}

// Format week range for display
function formatWeekRange(range: DateRange): string {
  // "Feb 3 - Feb 9" or "Jan 30 - Feb 5" (cross-month)
}

// Format custom range
function formatCustomRange(range?: DateRange): string {
  // Similar to week format
}
```

### Navigation Functions:

```typescript
// Navigate to previous period
function goToPreviousPeriod() {
  switch (periodTab) {
    case "week":
      setSelectedDate(subWeeks(selectedDate, 1));
    case "month":
      setSelectedDate(subMonths(selectedDate, 1));
    case "year":
      setSelectedDate(subYears(selectedDate, 1));
  }
}

// Navigate to next period
function goToNextPeriod() {
  // Similar to previous, using addWeeks, addMonths, addYears
}
```

### Spending Trend Data Processing:

```typescript
// Aggregate daily data by granularity
function aggregateTrendData(
  dailyData: Array<{ date: string; total: number }>,
  granularity: "day" | "week" | "month",
): Array<{ label: string; amount: number }> {
  switch (granularity) {
    case "day":
      return dailyData.map((d) => ({
        label: format(new Date(d.date), "MMM d"),
        amount: d.total,
      }));

    case "week": // Group by week, sum totals
    case "month": // Group by month, sum totals
  }
}
```

---

## Data Fetching Adjustments

### useAnalysisSummary Hook:

- Should already support `dateRange` and `includeAdhoc` filters
- Verify it returns:
  - `categoryBreakdown` (with non-zero filter)
  - `totalExpenses`
  - `totalTransactions`
  - `averageExpense`
  - `topCategory`
  - `dailyTrend` (for spending chart)

### Category Breakdown Filtering:

```typescript
// Only include categories with total > 0
const nonZeroCategories = summary.categoryBreakdown.filter(
  (cat) => cat.total > 0,
);
```

---

## UI Component Changes

### 1. Period Selector Component Structure:

```tsx
<div className="sticky top-0 z-10 bg-background pb-4">
  {/* Tabs */}
  <Tabs value={periodTab} onValueChange={setPeriodTab}>
    <TabsList className="w-full">
      <TabsTrigger value="week">Week</TabsTrigger>
      <TabsTrigger value="month">Month</TabsTrigger>
      <TabsTrigger value="year">Year</TabsTrigger>
      <TabsTrigger value="custom">Custom</TabsTrigger>
    </TabsList>
  </Tabs>

  {/* Navigation */}
  <div className="flex items-center justify-between mt-4">
    <Button variant="ghost" size="icon" onClick={goToPreviousPeriod}>
      <ChevronLeft />
    </Button>
    <span className="font-semibold text-lg">{periodDisplay}</span>
    <Button variant="ghost" size="icon" onClick={goToNextPeriod}>
      <ChevronRight />
    </Button>
  </div>

  {/* Custom date pickers (only shown when periodTab === 'custom') */}
  {periodTab === 'custom' && (
    <div className="flex gap-2 mt-4">
      <Input type="date" ... />
      <Input type="date" ... />
    </div>
  )}

  {/* Exclude Adhoc toggle */}
  <div className="flex items-center justify-between mt-4">
    <Label>Exclude Adhoc Expenses</Label>
    <Switch checked={excludeAdhoc} onCheckedChange={setExcludeAdhoc} />
  </div>
</div>
```

### 2. Category Breakdown Component:

```tsx
<div className="space-y-4">
  <h3 className="text-sm font-medium">Category Breakdown</h3>

  {/* Donut Chart */}
  <div className="h-64">
    <ResponsiveContainer>
      <PieChart>
        <Pie data={pieData} innerRadius={50} outerRadius={80} ... />
        <Tooltip content={<CustomPieTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  </div>

  {/* Legend - ALL non-zero categories */}
  <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-x-4">
    {nonZeroCategories.map(cat => (
      <div key={cat.categoryId} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CategoryIcon icon={cat.categoryIcon} color={cat.categoryColor} size="sm" />
          <span className="truncate">{cat.categoryName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-medium">{currency.symbol}{formatValue(cat.total)}</span>
          <span className="text-muted-foreground">{cat.percentage.toFixed(1)}%</span>
        </div>
      </div>
    ))}
  </div>
</div>
```

### 3. Spending Trend Component:

```tsx
<div className="space-y-4">
  {/* Header with granularity selector */}
  <div className="flex items-center justify-between">
    <h3 className="text-sm font-medium">Spending Trend</h3>

    {granularityOptions.length > 1 && (
      <Select value={trendGranularity} onValueChange={setTrendGranularity}>
        <SelectTrigger className="w-24 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {granularityOptions.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}
  </div>

  {/* Bar Chart */}
  <div className="h-64">
    <ResponsiveContainer>
      <BarChart data={aggregatedTrendData}>
        {/* ... existing chart config ... */}
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>
```

---

## Removed/Deprecated Elements

### Remove:

1. **Current filter section** - Replaced by integrated period selector
2. **Time period date range display** - Integrated into navigation
3. **Separate time period tabs in filter box** - Moved to top-level tabs
4. **"Excluding Adhoc" badge** - Filter is visible as toggle, no need for badge

### Keep but Move:

1. **Exclude Adhoc toggle** - Move to period selector section
2. **Export button** - Move to bottom
3. **All charts and stats** - Keep but reorder

---

## Implementation Checklist

### Phase 1: State & Logic

- [ ] Add new state variables (periodTab, selectedDate, trendGranularity)
- [ ] Create date range helper functions (getWeekRange, getMonthRange, getYearRange)
- [ ] Create period display formatters (formatWeekRange, etc.)
- [ ] Create navigation functions (goToPrevious/NextPeriod)
- [ ] Create spending trend data aggregation function
- [ ] Update dateRange computation based on new state

### Phase 2: UI Restructure

- [ ] Create period selector section (tabs + navigation + toggle)
- [ ] Move Category Breakdown to top (after period selector)
- [ ] Update category legend to show all non-zero categories
- [ ] Add responsive grid for legend on desktop (2 columns)
- [ ] Move summary stats below category breakdown
- [ ] Update spending trend section with granularity dropdown
- [ ] Move export button to bottom

### Phase 3: Interactions & Polish

- [ ] Implement tab switching (reset to current period)
- [ ] Implement arrow navigation (cycle periods)
- [ ] Show/hide custom date pickers based on tab
- [ ] Update granularity dropdown options dynamically
- [ ] Implement trend data aggregation based on granularity
- [ ] Test adhoc filter toggle updates all sections
- [ ] Add animations for section transitions (keep framer-motion)

### Phase 4: Responsive & Edge Cases

- [ ] Test mobile view (single column, scrollable)
- [ ] Test desktop view (multi-column grids)
- [ ] Handle edge cases (no data for period, zero categories)
- [ ] Ensure week navigation handles year boundaries
- [ ] Ensure month navigation handles year boundaries
- [ ] Test custom date range validation
- [ ] Verify currency formatting throughout

### Phase 5: Accessibility & UX

- [ ] Add aria-labels to navigation arrows
- [ ] Ensure keyboard navigation works for all controls
- [ ] Test with screen readers
- [ ] Add loading states if needed
- [ ] Add empty states with helpful messages
- [ ] Test period cycling performance with large datasets

---

## Testing Scenarios

1. **Period Navigation**:
   - Switch between Week/Month/Year tabs → should reset to current period
   - Use arrows to navigate → data updates correctly
   - Navigate across year boundaries → dates calculated correctly

2. **Category Breakdown**:
   - Multiple categories → all non-zero shown
   - Single category → chart still displays
   - No categories → empty state shown
   - Desktop view → categories in 2 columns

3. **Spending Trend**:
   - Week tab → no granularity dropdown, always daily
   - Month tab → dropdown shows Day/Week, aggregation works
   - Year tab → dropdown shows Day/Week/Month, aggregation works
   - Custom tab → appropriate options based on range length

4. **Adhoc Filter**:
   - Toggle on/off → all sections update (category, stats, trend)
   - Percentages recalculate correctly
   - Top category updates if needed

5. **Export**:
   - Still exports based on current period context
   - Filename reflects period being viewed

---

## Import Additions Required

```typescript
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
  subYears,
  addWeeks,
  addMonths,
  addYears,
} from "date-fns";
```

---

## Design Notes

- **Sticky Period Selector**: Consider making the period selector sticky on scroll so users can always change context
- **Animation**: Keep framer-motion animations but ensure they don't interfere with navigation
- **Loading States**: If data fetching is slow, consider skeleton loaders for chart sections
- **Empty States**: Ensure helpful messaging when no data exists for selected period
- **Color Consistency**: Use category hex colors throughout (chart, legend, icons)
- **Mobile Optimization**: Test on various screen sizes (320px, 375px, 414px widths)

---

## Success Criteria

✅ **Simplified Default View**: Most users only need Week/Month/Year cycling  
✅ **Mobile-First**: Primary information (category breakdown) visible without scrolling  
✅ **Context-Driven**: All data clearly tied to selected period  
✅ **Progressive Disclosure**: Custom analysis available when needed  
✅ **Visual Clarity**: Category colors and icons consistent throughout  
✅ **Performance**: Fast period switching, smooth animations  
✅ **Accessible**: Keyboard navigation, screen reader friendly

---

**End of Implementation Plan**
