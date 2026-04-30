const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "linkedin-data-api.p.rapidapi.com";
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const ALLOW_DEMO_FALLBACK = (process.env.ALLOW_DEMO_FALLBACK || "true").toLowerCase() === "true";

function toNumberSafe(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function deriveInsights(company) {
  const followers = toNumberSafe(
    company?.followerCount || company?.followers || company?.numFollowers
  );

  const employeeLow = toNumberSafe(
    company?.employeeCountRange?.start ||
      company?.staffCountRange?.start ||
      company?.staffCount
  );
  const employeeHigh = toNumberSafe(
    company?.employeeCountRange?.end || company?.staffCountRange?.end || employeeLow
  );

  const specialties = Array.isArray(company?.specialities)
    ? company.specialities
    : Array.isArray(company?.specialties)
      ? company.specialties
      : [];

  const locations = Array.isArray(company?.locations)
    ? company.locations.length
    : company?.headquarters
      ? 1
      : 0;

  const scale = Math.max(employeeHigh, 1);
  const followerPressure = Math.min(100, Math.round((followers / Math.max(scale, 1)) * 10));
  const specializationDepth = Math.min(100, specialties.length * 8);
  const geoReachScore = Math.min(100, locations * 14);

  const hiringMomentum = Math.round((followerPressure * 0.45) + (specializationDepth * 0.35) + (geoReachScore * 0.2));

  const recommendedRoleThemes = specialties.slice(0, 6).map((topic) => `${topic} Specialist`);

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      source: "linkedin-data-api.p.rapidapi.com/get-company-by-domain"
    },
    companySnapshot: {
      name: company?.name || company?.companyName || "Unknown",
      domain: company?.website || company?.url || null,
      linkedinUrl: company?.linkedinUrl || company?.companyUrl || null,
      industry: company?.industries?.[0] || company?.industry || "Unknown",
      headquarters: company?.headquarters || "Unknown",
      followers,
      employeeRange: {
        start: employeeLow,
        end: employeeHigh
      }
    },
    insightSignals: {
      followerPressure,
      specializationDepth,
      geoReachScore,
      hiringMomentum
    },
    jobAnalytics: {
      estimatedOpeningsBand: Math.max(5, Math.round(hiringMomentum / 4)),
      hiringUrgency: hiringMomentum > 70 ? "High" : hiringMomentum > 40 ? "Medium" : "Emerging",
      topRoleThemes: recommendedRoleThemes.length ? recommendedRoleThemes : ["Growth Engineer", "Product Analyst", "Operations Manager"],
      marketStory:
        hiringMomentum > 70
          ? "Strong growth signature with broad hiring potential across teams."
          : hiringMomentum > 40
            ? "Steady hiring trajectory with focused functional expansion."
            : "Early momentum; watch for selective, high-impact roles."
    }
  };
}

function buildDemoCompany(domain) {
  const cleanDomain = String(domain || "example.com").toLowerCase();
  const brand = cleanDomain.split(".")[0] || "Example";
  const name = brand.charAt(0).toUpperCase() + brand.slice(1);

  return {
    name,
    website: `https://${cleanDomain}`,
    industry: "Technology",
    headquarters: "Data not available",
    followerCount: 185000,
    employeeCountRange: { start: 1200, end: 4900 },
    specialities: ["AI", "Cloud", "Data", "Developer Tools", "Security"],
    locations: [{ name: "North America" }, { name: "Europe" }, { name: "APAC" }]
  };
}

async function fetchCompanyByDomain(domain) {
  if (!RAPIDAPI_KEY) {
    throw new Error("Missing RAPIDAPI_KEY in environment variables.");
  }

  const endpoint = new URL("https://linkedin-data-api.p.rapidapi.com/get-company-by-domain");
  endpoint.searchParams.set("domain", domain);

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-host": RAPIDAPI_HOST,
      "x-rapidapi-key": RAPIDAPI_KEY
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LinkedIn API request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data;
}

async function getCompanyAndInsights(domain) {
  const companyData = await fetchCompanyByDomain(domain);

  if (companyData && companyData.success === false) {
    const serviceMessage = companyData.message || "LinkedIn provider reported a service error.";

    if (!ALLOW_DEMO_FALLBACK) {
      throw new Error(serviceMessage);
    }

    const demoCompany = buildDemoCompany(domain);
    const insights = deriveInsights(demoCompany);

    return {
      rawCompanyData: companyData,
      insights: {
        ...insights,
        meta: {
          ...insights.meta,
          fallbackMode: true,
          fallbackReason: serviceMessage
        }
      }
    };
  }

  const company = companyData?.data || companyData;
  const insights = deriveInsights(company || {});

  return {
    rawCompanyData: companyData,
    insights
  };
}

module.exports = {
  getCompanyAndInsights
};
