# Property Value API Options

## Overview
This document outlines available API options for tracking real estate property values in Vesta.

## API Provider Comparison

### Option 1: Realty Mole Property API (RECOMMENDED)
**Platform:** RapidAPI  
**Website:** https://rapidapi.com/realtymole/api/realty-mole-property-api

**Features:**
- Property value estimates (AVM - Automated Valuation Model)
- Property details and history
- Comparable sales data
- Covers all 50 US states
- Good coverage: 155M+ properties

**Pricing:**
- Free tier: 100 requests/month
- Basic: $10/month - 1,000 requests
- Pro: $50/month - 10,000 requests

**Data Format:**
```json
{
  "address": "123 Main St, San Francisco, CA 94102",
  "value": 1250000,
  "valueLow": 1200000,
  "valueHigh": 1300000,
  "lastUpdated": "2025-01-01"
}
```

**Pros:**
- ✅ Reliable API via RapidAPI
- ✅ Good free tier for testing
- ✅ Covers nationwide
- ✅ Property value estimates included
- ✅ Active maintenance and support

**Cons:**
- ❌ Paid service (though reasonable)
- ❌ Rate limits on free tier

---

### Option 2: Attom Property API
**Platform:** Direct / RapidAPI  
**Website:** https://www.attomdata.com/

**Features:**
- Comprehensive property data
- AVMs (Automated Valuation Models)
- Market trends
- Property characteristics

**Pricing:**
- Custom pricing (enterprise)
- Free trial available
- Generally more expensive

**Pros:**
- ✅ Very comprehensive data
- ✅ High accuracy
- ✅ Enterprise-grade reliability

**Cons:**
- ❌ Expensive for personal use
- ❌ Requires business account
- ❌ Complex pricing

---

### Option 3: Zillow (Direct - Bridge Interactive)
**Platform:** Bridge Interactive  
**Website:** https://www.zillowgroup.com/developers/

**Features:**
- Official Zestimate data
- Property details
- Market data
- Historical trends

**Pricing:**
- Requires approval
- Enterprise pricing
- Not publicly disclosed

**Pros:**
- ✅ Official Zillow data
- ✅ High brand recognition
- ✅ Comprehensive coverage

**Cons:**
- ❌ Requires business approval
- ❌ Not easily accessible
- ❌ Enterprise-level only
- ❌ Complex application process

---

### Option 4: HasData (Zillow/Redfin Scraper)
**Platform:** HasData  
**Website:** https://hasdata.com/

**Features:**
- Scrapes Zillow and Redfin data
- Property listings
- Market insights
- Structured JSON output

**Pricing:**
- Pay per request
- Starting at $0.001 per request
- Volume discounts available

**Pros:**
- ✅ Access to Zillow/Redfin data
- ✅ Flexible pricing

**Cons:**
- ❌ Web scraping (less reliable)
- ❌ May violate ToS
- ❌ No guarantee of uptime
- ❌ Data quality concerns

---

### Option 5: CoreLogic / Other Enterprise APIs
**Platform:** Various  

**Features:**
- Professional-grade data
- High accuracy
- Comprehensive coverage

**Pricing:**
- Enterprise only
- Very expensive
- Custom contracts

**Pros:**
- ✅ Highest accuracy
- ✅ Professional data

**Cons:**
- ❌ Too expensive for personal use
- ❌ Overkill for Vesta use case

---

### Option 6: Manual Entry Mode (Fallback)
**Platform:** None (User input)

**Features:**
- Users manually enter property values
- Track changes over time
- No API needed

**Pricing:**
- Free

**Pros:**
- ✅ No API costs
- ✅ Perfect for testing
- ✅ Works immediately
- ✅ Privacy-friendly

**Cons:**
- ❌ Manual updates required
- ❌ No automation
- ❌ Not scalable

---

## Recommendation Matrix

### For Development/Testing
**Best:** Manual Entry Mode  
**Why:** Free, immediate, no API setup needed

### For Personal Use (1-3 properties)
**Best:** Realty Mole Property API (Free tier)  
**Why:** 100 requests/month is sufficient for daily checks on 3 properties

### For Production (Many users/properties)
**Best:** Realty Mole Property API (Paid tier) or Attom  
**Why:** Reliable, scalable, professional support

### For Enterprise
**Best:** Zillow (Bridge Interactive) or CoreLogic  
**Why:** Highest accuracy, comprehensive data

---

## Implementation Priority

### Phase 1: Manual Entry Mode
- Start here for immediate functionality
- Perfect for testing and MVP
- No external dependencies

### Phase 2: Realty Mole API
- Add as enhancement
- Use free tier first
- Upgrade to paid if needed

### Phase 3: Additional Providers
- Add Attom or others as alternatives
- Implement provider abstraction layer
- Allow users to choose provider

---

## API Selection Decision Tree

```
Are you just testing the feature?
├─ YES → Manual Entry Mode
└─ NO → How many properties will you track?
    ├─ 1-3 properties → Realty Mole (Free tier)
    └─ Many properties → Do you have budget?
        ├─ YES ($10-50/mo) → Realty Mole (Paid tier)
        └─ NO → Manual Entry Mode
```

---

## Code Example: Multi-Provider Support

```python
class PropertySource:
    """Supports multiple API providers."""
    
    PROVIDERS = {
        "manual": ManualProvider,
        "realty_mole": RealtyMoleProvider,
        "attom": AttomProvider,
        "zillow": ZillowProvider,
    }
    
    def __init__(self, provider: str, api_key: Optional[str] = None):
        if provider not in self.PROVIDERS:
            raise ValueError(f"Unknown provider: {provider}")
        
        self.provider_class = self.PROVIDERS[provider]
        self.provider = self.provider_class(api_key=api_key)
    
    def get_property_value(self, address: str) -> Dict:
        """Get property value using configured provider."""
        return self.provider.fetch_value(address)
```

---

## Next Steps

1. **Start with Manual Entry** - Implement basic feature without API
2. **Test with Realty Mole Free Tier** - Verify API integration works
3. **Evaluate Results** - Determine if paid tier is needed
4. **Add Provider Abstraction** - Make it easy to swap providers
5. **Document Everything** - Help users choose right provider

---

## Resources

- **Realty Mole API Docs:** https://rapidapi.com/realtymole/api/realty-mole-property-api
- **RapidAPI Real Estate Category:** https://rapidapi.com/category/Real%20Estate
- **Zillow Developer:** https://www.zillowgroup.com/developers/
- **Attom Data:** https://www.attomdata.com/

---

## Important Notes

- Property values are **estimates**, not appraisals
- Update frequency: Daily is typically sufficient
- Privacy: Be careful with address data logging
- Rate limits: Monitor API usage to avoid overages
- Accuracy: Cross-reference with multiple sources when possible

