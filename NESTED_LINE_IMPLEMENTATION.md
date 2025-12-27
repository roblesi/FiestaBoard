# MUNI Nested Line Implementation - Complete

## Overview

Successfully implemented nested accordion structure for MUNI lines, allowing per-line filtering at each stop with intuitive template syntax like `{{muni.stops.0.lines.N.formatted}}`.

---

## What Was Implemented

### 1. Backend - Line Grouping
**File:** `src/data_sources/muni.py`

- Groups arrivals by line at each stop
- Returns nested structure: `stops[0].lines.N`, `stops[0].lines.J`, etc.
- Provides `all_lines` for combined view
- Line code normalization (JUDAH → N, CHURCH → J, etc.)

### 2. Template Engine
**File:** `src/templates/engine.py`

- Added nested line variables to AVAILABLE_VARIABLES
- Added max lengths for nested paths
- Existing array/dict navigation handles nested structure automatically

### 3. Variable Picker UI
**File:** `web/src/components/variable-picker.tsx`

- Nested accordion: Stop → Lines → Variables
- Shows line count and live data
- Expandable per-line accordions
- Helpful placeholder when no stops configured

---

## Data Structure

### Backend Response
```json
{
  "stops": [
    {
      "stop_code": "15210",
      "stop_name": "Judah St & 34th Ave",
      "lines": {
        "N": {
          "line": "N-JUDAH",
          "line_code": "N",
          "arrivals": [...],
          "next_arrival": 5,
          "is_delayed": false,
          "formatted": "N-JUDAH: 5, 15, 25 MIN"
        },
        "J": {
          "line": "J-CHURCH",
          "line_code": "J",
          "arrivals": [...],
          "next_arrival": 8,
          "formatted": "J-CHURCH: 8, 18 MIN"
        }
      },
      "all_lines": {
        "formatted": "N/J: 5, 8, 15 MIN",
        "next_arrival": 5,
        "is_delayed": false
      }
    }
  ]
}
```

---

## Template Usage

### Show Only N Line
```
{center}N LINE ARRIVALS
{{muni.stops.0.lines.N.formatted}}
Next train: {{muni.stops.0.lines.N.next_arrival}}m
```

**Output:**
```
   N LINE ARRIVALS   
N-JUDAH: 5, 15, 25 MIN
Next train: 5m        
```

### Show Multiple Lines from Same Stop
```
{center}CHURCH & DUBOCE
N: {{muni.stops.0.lines.N.next_arrival}}m
J: {{muni.stops.0.lines.J.next_arrival}}m
KT: {{muni.stops.0.lines.KT.next_arrival}}m
```

**Output:**
```
   CHURCH & DUBOCE   
N: 5m                
J: 8m                
KT: 12m              
```

### Show All Lines Combined
```
{center}ALL TRAINS
{{muni.stops.0.all_lines.formatted}}
```

**Output:**
```
     ALL TRAINS      
N/J/KT: 5, 8, 12 MIN 
```

---

## Line Code Normalization

The 511.org API returns inconsistent line names. We normalize them for easier template use:

| API Returns | Normalized To | Template Usage |
|-------------|---------------|----------------|
| JUDAH | N | `lines.N.*` |
| N-JUDAH | N | `lines.N.*` |
| CHURCH | J | `lines.J.*` |
| J-CHURCH | J | `lines.J.*` |
| TARAVAL | L | `lines.L.*` |
| OCEAN VIEW | M | `lines.M.*` |
| THIRD | T | `lines.T.*` |
| KT | KT | `lines.KT.*` |

---

## Variable Picker UI

### Structure
```
Muni ▼
├── General Variables
│   ├── stop_count
│   ├── line (backward compat)
│   ├── formatted (backward compat)
│   └── ...
│
└── 🚇 Stops (2)
    ├── ▶ [0] Judah St & 34th Ave
    │   │
    │   ├── Stop Info
    │   │   ├── stop_name
    │   │   └── stop_code
    │   │
    │   ├── All Lines (Combined)
    │   │   ├── all_lines.formatted
    │   │   └── all_lines.next_arrival
    │   │
    │   └── Lines (2) ▼
    │       ├── ▶ N - N-Judah
    │       │   ├── lines.N.formatted
    │       │   ├── lines.N.next_arrival
    │       │   ├── lines.N.is_delayed
    │       │   └── lines.N.line
    │       │
    │       └── ▶ J - J-Church
    │           ├── lines.J.formatted
    │           └── ...
    │
    └── ▶ [1] Church & Duboce
        └── Lines (3)
            ├── N - N-Judah ▶
            ├── J - J-Church ▶
            └── KT - KT Ingleside ▶
```

---

## Backward Compatibility

All existing variables still work:

### Top Level (First Stop, First Line)
```
{{muni.line}}       → "N-JUDAH"
{{muni.formatted}}  → "N-JUDAH: 5, 15, 25 MIN"
```

### Stop Level (Backward Compat - Uses First Line)
```
{{muni.stops.0.line}}       → "N-JUDAH"
{{muni.stops.0.formatted}}  → "N-JUDAH: 5, 15, 25 MIN"
```

### New Nested Access
```
{{muni.stops.0.lines.N.formatted}}      → N line only
{{muni.stops.0.lines.J.formatted}}      → J line only
{{muni.stops.0.all_lines.formatted}}    → All lines combined
```

---

## Benefits

✅ **Nested Accordion UI** - Matches your requested structure exactly  
✅ **Per-Line Filtering** - Show only N line arrivals from a stop  
✅ **No Stop Waste** - One stop can show multiple lines  
✅ **Discoverable** - UI shows what lines exist at each stop  
✅ **Flexible** - Mix and match lines from different stops  
✅ **Backward Compatible** - Old templates still work  

---

## Test Results

```bash
$ docker-compose exec vestaboard-api pytest tests/test_muni_nested_lines.py -v

======================== 6 passed in 0.07s =========================
```

**Tests:**
- ✅ Line normalization (JUDAH → N, CHURCH → J)
- ✅ Nested variable access (stops.0.lines.N.formatted)
- ✅ Multi-line templates
- ✅ Backward compatibility

---

## Real-World Example

**Your Current Setup:**
- Stop: 15210 (Judah St & 34th Ave)
- Line: N (N-Judah)
- Next arrivals: 5, 15, 25 minutes

**Template:**
```
{center}N TRAIN TO DOWNTOWN
{{muni.stops.0.lines.N.formatted}}
Next in {{muni.stops.0.lines.N.next_arrival}} minutes
```

**Renders as:**
```
 N TRAIN TO DOWNTOWN  
N-JUDAH: 5, 15, 25 MIN
Next in 5 minutes     
```

---

## Next Steps

1. **Refresh browser** - http://localhost:3000
2. **Go to Pages** → Edit/Create page
3. **Expand Muni** → Stops → [0] → Lines → N
4. **Click variables** to insert into template
5. **Enjoy line-specific arrivals!** 🚇

---

## Future Enhancements

If you add more stops with multiple lines:

**Stop A (Church & Duboce):**
- Lines: N, J, KT

**Stop B (Castro Station):**
- Lines: F, K, L, M

**Template:**
```
{center}MY COMMUTE
N from Church: {{muni.stops.0.lines.N.next_arrival}}m
J from Church: {{muni.stops.0.lines.J.next_arrival}}m
F from Castro: {{muni.stops.1.lines.F.next_arrival}}m
```

Perfect for showing exactly the lines you care about! 🎯

