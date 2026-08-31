"""Source Discovery layer for UniHack product data enrichment pipeline.

Architecture & Capabilities:
1. Domain Whitelist & Exclusion List:
   - Reads allowed official domains from shared/manufacturer_domains.json.
   - Enforces a strict DISALLOWED_DOMAINS exclusion list blocking marketplaces, e-commerce,
     and general distributors per AGENTS.md sourcing rules.
2. Product Page Locator:
   - Tier 1: Direct on-site manufacturer search patterns / endpoints.
   - Tier 2: Domain-restricted web search (e.g. site:<domain> <part_num>) with strict host validation.
3. Static Fetcher:
   - Requests pages with realistic browser headers and redirect tracking.
4. JS-Shell Tagging:
   - Evaluates text-to-code ratios and empty SPA mount elements.
   - Tags dynamic pages as LIKELY_JS_RENDERED for headless Playwright fallback.
"""

from typing import Any, Dict, List, Optional, Set, Tuple
from dataclasses import dataclass
import json
import os
import re
import urllib.parse
import requests
from bs4 import BeautifulSoup

# Strict exclusion list: E-commerce, marketplaces, distributors, aggregators
# NEVER used as product data sources per AGENTS.md Hard Constraint 5
DISALLOWED_DOMAINS: Set[str] = {
    "amazon.com",
    "homedepot.com",
    "lowes.com",
    "walmart.com",
    "ebay.com",
    "target.com",
    "bestbuy.com",
    "wayfair.com",
    "grainger.com",
    "zoro.com",
    "mscdirect.com",
    "mcmaster.com",
    "fastenal.com",
    "ferguson.com",
    "build.com",
    "supplyhouse.com",
    "webstaurantstore.com",
    "menards.com",
    "acehardware.com",
    "aliexpress.com",
    "alibaba.com",
    "overstock.com",
    "tractorsupply.com",
    "northerntool.com",
    "acmetools.com",
    "cpooutlets.com",
    "toolup.com",
    "toolnut.com",
    "sears.com",
    "kmart.com",
    "bedbathandbeyond.com",
    "rakuten.com",
    "abwappliances.com",
    "applianceconnection.com",
    "ajmadison.com",
    "pcrichard.com",
    "bing.com",
    "duckduckgo.com",
    "google.com",
}

# Known on-site search endpoint / URL patterns for top manufacturers
KNOWN_MFR_URL_PATTERNS: Dict[str, List[str]] = {
    "Frigidaire": [
        "https://www.frigidaire.com/en/p/owner-center/product-support/{part_num}",
        "https://www.frigidaire.com/en/p/kitchen/dishwashers/{part_num}",
        "https://www.frigidaire.com/en/search?q={part_num}",
    ],
    "Whirlpool": [
        "https://learnwhirlpool.com/smartsearchresults?searchtext={part_num_clean}",
        "https://learnwhirlpool.com/learningitem/{part_num_clean}-product-brief",
        "https://www.whirlpool.com/search.html?query={part_num}",
    ],
    "Diablo": [
        "https://www.diablotools.com/products/{part_num}",
        "https://www.diablotools.com/search?query={part_num}",
    ],
    "Freud": [
        "https://www.freudtools.com/products/{part_num}",
        "https://www.freudtools.com/search?query={part_num}",
    ],
    "3M": [
        "https://www.3m.com/3M/en_US/p/d/{part_num}/",
        "https://www.3m.com/3M/en_US/search/?Ntt={part_num}",
    ],
    "Milwaukee": [
        "https://www.milwaukeetool.com/Search?search={part_num}",
        "https://www.milwaukeetool.com/Products/{part_num}",
    ],
    "Bosch": [
        "https://www.boschtools.com/us/en/search/?q={part_num}",
    ],
    "Makita": [
        "https://www.makitatools.com/products/details/{part_num}",
        "https://www.makitatools.com/search?q={part_num}",
    ],
    "DEWALT": [
        "https://www.dewalt.com/search?search={part_num}",
    ],
    "Festool": [
        "https://www.festoolusa.com/search?q={part_num}",
    ],
}


@dataclass
class SourceDiscoveryResult:
    product_page_url: Optional[str]
    raw_html: Optional[str]
    is_js_rendered: bool
    discovery_method: str
    status_code: int = 200
    tag: str = "STATIC_HTML_RENDERED"


class SourceDiscovery:
    """Discovers and fetches official manufacturer product documentation."""

    def __init__(self, domains_json_path: Optional[str] = None):
        if domains_json_path is None:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
            domains_json_path = os.path.join(base_dir, "shared", "manufacturer_domains.json")
            
        self.domains_json_path = domains_json_path
        self.domain_map: Dict[str, List[str]] = {}
        self._load_domains()
        
        # Standard browser headers
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

    def _load_domains(self) -> None:
        """Load manufacturer to domain mappings from JSON."""
        if os.path.exists(self.domains_json_path):
            try:
                with open(self.domains_json_path, encoding="utf-8") as f:
                    data = json.load(f)
                    self.domain_map = data.get("domains", {})
            except Exception:
                self.domain_map = {}

    def is_disallowed(self, url_or_domain: str) -> bool:
        """Check if a URL or domain belongs to the disallowed retailer/distributor list."""
        if not url_or_domain:
            return True
        try:
            parsed = urllib.parse.urlparse(url_or_domain)
            domain = parsed.netloc if parsed.netloc else url_or_domain
            domain = domain.lower().split(":")[0]
            
            # Check domain and subdomains
            for disallowed in DISALLOWED_DOMAINS:
                if domain == disallowed or domain.endswith("." + disallowed):
                    return True
            return False
        except Exception:
            return True

    def get_official_domains(self, manufacturer_name: Optional[str], brand_name: Optional[str] = None) -> List[str]:
        """Look up authorized domains for a given manufacturer/brand."""
        domains: List[str] = []
        
        # Check brand name first
        if brand_name:
            clean_brand = re.sub(r"[®™]", "", brand_name).strip()
            for key, d_list in self.domain_map.items():
                if key.lower() == clean_brand.lower():
                    domains.extend(d_list)

        # Check manufacturer name
        if manufacturer_name and not domains:
            clean_mfr = re.sub(r"[®™]", "", manufacturer_name).split("(")[0].strip()
            for key, d_list in self.domain_map.items():
                if key.lower() in clean_mfr.lower() or clean_mfr.lower() in key.lower():
                    domains.extend(d_list)

        # Filter out any disallowed domains
        return [d for d in domains if not self.is_disallowed(d)]

    def is_official_url(
        self,
        url: str,
        manufacturer_name: Optional[str],
        brand_name: Optional[str] = None,
    ) -> bool:
        """Return whether a URL belongs to the resolved manufacturer's allowlist."""
        if not url or self.is_disallowed(url):
            return False
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            return False
        host = parsed.hostname.lower()
        return any(host == domain.lower() or host.endswith("." + domain.lower())
                   for domain in self.get_official_domains(manufacturer_name, brand_name))

    def search_domain_restricted(self, domain: str, part_num: str, max_results: int = 3) -> List[str]:
        """Search for a product on an official domain using search queries."""
        query = f"site:{domain} {part_num}"
        search_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
        
        try:
            resp = requests.post(search_url, data={"q": query}, headers=self.headers, timeout=8)
            if resp.status_code != 200:
                return []
                
            soup = BeautifulSoup(resp.text, "html.parser")
            found_urls: List[str] = []
            
            for a in soup.find_all("a", class_="result__url"):
                href = a.get("href", "")
                if "uddg=" in href:
                    parsed = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)
                    actual_url = parsed.get("uddg", [href])[0]
                else:
                    actual_url = href.strip()
                    
                if actual_url.startswith("http") and domain in actual_url and not self.is_disallowed(actual_url):
                    found_urls.append(actual_url)
                    if len(found_urls) >= max_results:
                        break
                        
            return found_urls
        except Exception:
            return []

    def locate_product_page(
        self,
        manufacturer_name: Optional[str],
        mfg_part_num: str,
        part_desc: Optional[str] = None,
        brand_name: Optional[str] = None,
    ) -> Tuple[Optional[str], str]:
        """Find the most specific official product page URL for a product."""
        if not mfg_part_num:
            return None, "NO_PART_NUMBER"

        clean_part = mfg_part_num.strip()
        part_num_clean = clean_part.rstrip("Z") if len(clean_part) > 6 and clean_part.endswith("Z") else clean_part
        
        lookup_brand = brand_name or manufacturer_name or ""
        clean_brand = re.sub(r"[®™]", "", lookup_brand).strip()

        # Step 1: Check Known Official URL Patterns
        for brand_key, patterns in KNOWN_MFR_URL_PATTERNS.items():
            if brand_key.lower() in clean_brand.lower() or (manufacturer_name and brand_key.lower() in manufacturer_name.lower()):
                for pattern in patterns:
                    candidate_url = pattern.format(
                        part_num=clean_part,
                        part_num_clean=part_num_clean,
                    )
                    if not self.is_disallowed(candidate_url):
                        return candidate_url, "KNOWN_OEM_PATTERN"

        # Step 2: Domain-Restricted Search
        official_domains = self.get_official_domains(manufacturer_name, brand_name)
        for domain in official_domains:
            results = self.search_domain_restricted(domain, clean_part)
            if results:
                return results[0], f"DOMAIN_SEARCH_{domain.upper()}"

        # Step 3: Fallback generic domain search
        if official_domains:
            primary_domain = official_domains[0]
            fallback_url = f"https://www.{primary_domain}/search?q={urllib.parse.quote(clean_part)}"
            return fallback_url, "GENERIC_DOMAIN_SEARCH_FALLBACK"

        return None, "NO_OFFICIAL_DOMAIN_FOUND"

    def fetch_page(self, url: str, timeout: int = 3) -> Dict[str, Any]:
        """Fetch a page via static HTTP request and assess if it requires JS rendering."""
        if not url:
            return {
                "status_code": 0,
                "final_url": "",
                "raw_html": "",
                "text_content": "",
                "tag": "EMPTY_URL",
                "is_js_rendered": False,
                "error": "No URL provided",
            }

        try:
            session = requests.Session()
            session.headers.update(self.headers)
            
            resp = session.get(url, timeout=timeout, allow_redirects=True)
            final_url = str(resp.url)
            raw_html = resp.text
            status_code = resp.status_code

            soup = BeautifulSoup(raw_html, "html.parser")
            for el in soup(["script", "style", "noscript", "svg", "header", "footer", "nav"]):
                el.decompose()
                
            visible_text = soup.get_text(separator=" ", strip=True)
            visible_len = len(visible_text)
            html_len = len(raw_html)

            is_empty_spa = bool(soup.find(id=["root", "__next", "app", "main-content"]) and visible_len < 300)
            is_low_text_ratio = (visible_len / max(html_len, 1)) < 0.03
            is_js_rendered = (visible_len < 350) or is_empty_spa or is_low_text_ratio

            tag = "LIKELY_JS_RENDERED" if is_js_rendered else "STATIC_HTML_RENDERED"

            return {
                "status_code": status_code,
                "final_url": final_url,
                "raw_html": raw_html,
                "text_content": visible_text,
                "html_length": html_len,
                "text_length": visible_len,
                "tag": tag,
                "is_js_rendered": is_js_rendered,
                "error": None,
            }
        except requests.exceptions.Timeout:
            return {
                "status_code": 408,
                "final_url": url,
                "raw_html": "",
                "text_content": "",
                "tag": "LIKELY_JS_RENDERED",
                "is_js_rendered": True,
                "error": "HTTP request timed out",
            }
        except Exception as e:
            return {
                "status_code": 0,
                "final_url": url,
                "raw_html": "",
                "text_content": "",
                "tag": "FETCH_ERROR",
                "is_js_rendered": True,
                "error": str(e),
            }

    def discover_and_fetch(
        self,
        manufacturer_name: Optional[str],
        mfg_part_num: str,
        part_desc: Optional[str] = None,
        brand_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """High-level pipeline method: discover product page and fetch content."""
        url, method = self.locate_product_page(
            manufacturer_name=manufacturer_name,
            mfg_part_num=mfg_part_num,
            part_desc=part_desc,
            brand_name=brand_name,
        )

        fetch_result = self.fetch_page(url) if url else {}

        return {
            "mfg_part_num": mfg_part_num,
            "manufacturer_name": manufacturer_name,
            "brand_name": brand_name,
            "discovered_url": url,
            "discovery_method": method,
            "fetch_result": fetch_result,
        }


# Singleton accessor
_default_discovery: Optional[SourceDiscovery] = None


def get_source_discovery() -> SourceDiscovery:
    global _default_discovery
    if _default_discovery is None:
        _default_discovery = SourceDiscovery()
    return _default_discovery


def discover_source(
    manufacturer: Optional[str],
    brand: Optional[str],
    mfg_part_num: str,
    part_desc: Optional[str] = None,
) -> SourceDiscoveryResult:
    """Discover official product page and fetch raw HTML."""
    disco = get_source_discovery()
    url, method = disco.locate_product_page(
        manufacturer_name=manufacturer,
        mfg_part_num=mfg_part_num,
        part_desc=part_desc,
        brand_name=brand,
    )

    fetch_res = disco.fetch_page(url) if url else {}
    final_url = fetch_res.get("final_url", url or "")
    if url and not disco.is_official_url(final_url, manufacturer, brand):
        return SourceDiscoveryResult(
            product_page_url=None,
            raw_html=None,
            is_js_rendered=False,
            discovery_method=f"{method}; REJECTED_NON_OFFICIAL_REDIRECT",
            status_code=fetch_res.get("status_code", 0),
            tag="NON_OFFICIAL_REDIRECT",
        )
    return SourceDiscoveryResult(
        product_page_url=final_url,
        raw_html=fetch_res.get("raw_html", ""),
        is_js_rendered=fetch_res.get("is_js_rendered", False),
        discovery_method=method,
        status_code=fetch_res.get("status_code", 200),
        tag=fetch_res.get("tag", "STATIC_HTML_RENDERED"),
    )
