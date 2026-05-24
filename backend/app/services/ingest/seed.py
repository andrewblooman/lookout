"""Seeds the database with realistic threat intel data when tables are empty."""
import uuid
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.models import Actor, Campaign, IOC, CVE, NewsArticle, Feed, Report
from app.core.config import settings

logger = logging.getLogger(__name__)

_ACTORS = [
    # --- Russian state-sponsored ---
    {"name": "APT29", "aliases": ["Cozy Bear", "The Dukes", "Midnight Blizzard", "IRON RITUAL"], "origin_country": "RU",
     "motivation": "espionage", "mitre_group_id": "G0016",
     "description": "Russian SVR-linked group known for stealthy intrusions against government and diplomatic targets, including the SolarWinds supply chain attack."},
    {"name": "APT28", "aliases": ["Fancy Bear", "Forest Blizzard", "STRONTIUM", "Sofacy"], "origin_country": "RU",
     "motivation": "espionage", "mitre_group_id": "G0007",
     "description": "Russian GRU Unit 26165 specialising in credential harvesting and espionage against NATO targets, political parties, and military organisations."},
    {"name": "Sandworm", "aliases": ["Voodoo Bear", "ELECTRUM", "Seashell Blizzard", "APT44"], "origin_country": "RU",
     "motivation": "sabotage", "mitre_group_id": "G0034",
     "description": "GRU Unit 74455 behind NotPetya, Ukrainian power grid attacks, and Olympic Destroyer; most destructive state-sponsored group on record."},
    {"name": "Turla", "aliases": ["Snake", "Uroburos", "Venomous Bear", "IRON HUNTER", "Waterbug"], "origin_country": "RU",
     "motivation": "espionage", "mitre_group_id": "G0010",
     "description": "FSB-linked group known for the Snake rootkit and long-term stealth operations against government and military targets worldwide."},
    {"name": "Gamaredon", "aliases": ["Primitive Bear", "ACTINIUM", "Shuckworm", "Armageddon"], "origin_country": "RU",
     "motivation": "espionage", "mitre_group_id": "G0047",
     "description": "FSB-affiliated group focusing almost exclusively on Ukrainian government, military, and NGO targets with commodity malware."},
    {"name": "Evil Corp", "aliases": ["Indrik Spider", "Dridex Gang", "UNC2165", "Gold Drake"], "origin_country": "RU",
     "motivation": "financial", "mitre_group_id": None,
     "description": "Sanctioned Russian cybercriminal enterprise responsible for Dridex banking trojan and BitPaymer/WastedLocker/Hades ransomware families."},
    # --- Chinese state-sponsored ---
    {"name": "APT41", "aliases": ["Double Dragon", "BARIUM", "Winnti", "Brass Typhoon"], "origin_country": "CN",
     "motivation": "espionage", "mitre_group_id": "G0096",
     "description": "Chinese dual-mission group conducting both state-sponsored espionage and financially motivated intrusions via game studio and software supply chains."},
    {"name": "Volt Typhoon", "aliases": ["Bronze Silhouette", "Vanguard Panda", "KV Botnet"], "origin_country": "CN",
     "motivation": "espionage", "mitre_group_id": "G1017",
     "description": "Chinese state actor pre-positioning in US critical infrastructure networks — utilities, transport, water — for potential disruptive attacks."},
    {"name": "APT1", "aliases": ["Comment Crew", "Comment Panda", "PLA Unit 61398", "TG-8223"], "origin_country": "CN",
     "motivation": "espionage", "mitre_group_id": "G0006",
     "description": "PLA Unit 61398 conducting large-scale intellectual property theft from US defence, aerospace, and energy sectors since 2006."},
    {"name": "APT3", "aliases": ["Gothic Panda", "UPS Team", "TG-0110", "Buckeye"], "origin_country": "CN",
     "motivation": "espionage", "mitre_group_id": "G0022",
     "description": "Suspected MSS-linked group exploiting browser zero-days to target aerospace, defence, and technology sectors."},
    {"name": "APT10", "aliases": ["menuPass", "Stone Panda", "Cloud Hopper", "POTASSIUM", "Cicada"], "origin_country": "CN",
     "motivation": "espionage", "mitre_group_id": "G0045",
     "description": "Chinese MSS contractor conducting Operation Cloud Hopper, targeting managed service providers to pivot into client networks across 12 countries."},
    {"name": "APT40", "aliases": ["Periscope", "Bronze Mohawk", "Kryptonite Panda", "Leviathan"], "origin_country": "CN",
     "motivation": "espionage", "mitre_group_id": "G0065",
     "description": "Chinese state actor targeting maritime research, naval defence contractors, and ASEAN governments in support of naval modernisation goals."},
    {"name": "Hafnium", "aliases": ["Silk Typhoon"], "origin_country": "CN",
     "motivation": "espionage", "mitre_group_id": "G0125",
     "description": "Chinese state group responsible for mass exploitation of ProxyLogon zero-days in Microsoft Exchange Server, primarily targeting US defence and policy sectors."},
    {"name": "Mustang Panda", "aliases": ["TA416", "RedDelta", "Bronze President", "Stately Taurus"], "origin_country": "CN",
     "motivation": "espionage", "mitre_group_id": None,
     "description": "MSS-affiliated group using PlugX and Cobalt Strike to target NGOs, religious organisations, and government entities across Asia and Europe."},
    {"name": "APT15", "aliases": ["VIXEN PANDA", "Nickel", "Ke3chang", "Bronze Davenport", "Mirage"], "origin_country": "CN",
     "motivation": "espionage", "mitre_group_id": "G0337",
     "description": "Chinese MSS group targeting diplomatic and government organisations across Europe and the Americas with Mirage and RoyalDNS RATs."},
    # --- North Korean state-sponsored ---
    {"name": "Lazarus Group", "aliases": ["Hidden Cobra", "ZINC", "Guardians of Peace", "Labyrinth Chollima"], "origin_country": "KP",
     "motivation": "financial", "mitre_group_id": "G0032",
     "description": "DPRK-linked group responsible for the Sony Pictures hack, Bangladesh Bank SWIFT heist, and ongoing cryptocurrency theft operations."},
    {"name": "Kimsuky", "aliases": ["Velvet Chollima", "Black Banshee", "TA406", "Emerald Sleet"], "origin_country": "KP",
     "motivation": "espionage", "mitre_group_id": "G0094",
     "description": "DPRK RGB intelligence unit targeting think tanks, government, and academia for geopolitical intelligence collection."},
    {"name": "APT37", "aliases": ["Reaper", "ScarCruft", "Group123", "InkySquid", "Ricochet Chollima"], "origin_country": "KP",
     "motivation": "espionage", "mitre_group_id": "G0067",
     "description": "DPRK RGB unit targeting South Korean government, military, and human rights organisations with RokRAT and custom implants."},
    {"name": "APT38", "aliases": ["Bluenoroff", "Stardust Chollima", "NICKEL GLADSTONE"], "origin_country": "KP",
     "motivation": "financial", "mitre_group_id": "G0082",
     "description": "Lazarus sub-group specialising in SWIFT banking fraud and cryptocurrency theft to fund DPRK weapons programmes."},
    {"name": "Andariel", "aliases": ["Silent Chollima", "NICKEL HYATT", "Onyx Sleet", "DarkSeoul"], "origin_country": "KP",
     "motivation": "sabotage", "mitre_group_id": "G0138",
     "description": "Lazarus sub-group deploying custom RATs, ransomware, and destructive wipers against South Korean financial and critical infrastructure targets."},
    # --- Iranian state-sponsored ---
    {"name": "APT33", "aliases": ["Elfin", "Refined Kitten", "Peach Sandstorm", "Holmium"], "origin_country": "IR",
     "motivation": "sabotage", "mitre_group_id": "G0064",
     "description": "IRGC-linked group targeting petrochemical, aerospace, and defence sectors with SHAMOON wiper and password spray campaigns."},
    {"name": "APT34", "aliases": ["OilRig", "Helix Kitten", "Hazel Sandstorm", "EUROPIUM"], "origin_country": "IR",
     "motivation": "espionage", "mitre_group_id": "G0049",
     "description": "MOIS-affiliated group conducting cyber operations against Middle Eastern governments, telecom, and energy sectors with POWRUNER and BONDUPDATER."},
    {"name": "APT35", "aliases": ["Charming Kitten", "Phosphorus", "Mint Sandstorm", "TA453", "Magic Hound"], "origin_country": "IR",
     "motivation": "espionage", "mitre_group_id": "G0059",
     "description": "Iranian IRGC unit targeting journalists, academics, think tanks, and dissidents globally via credential phishing and mobile implants."},
    {"name": "MuddyWater", "aliases": ["Static Kitten", "Seedworm", "MERCURY", "TA450", "Mango Sandstorm"], "origin_country": "IR",
     "motivation": "espionage", "mitre_group_id": "G0069",
     "description": "Iranian MOIS unit using PowerShell-heavy TTPs to target governments, telecoms, and IT companies across MENA and Central Asia."},
    {"name": "APT39", "aliases": ["Chafer", "Remix Kitten", "ITG07", "Ballistic Bobcat"], "origin_country": "IR",
     "motivation": "espionage", "mitre_group_id": "G0087",
     "description": "MOIS contractor targeting telecommunications, travel, and IT industries to support Iranian mass surveillance programmes."},
    # --- Criminal / Ransomware-as-a-Service ---
    {"name": "FIN7", "aliases": ["Carbanak Group", "Navigator Group", "Carbon Spider", "Sangria Tempest"], "origin_country": "RU",
     "motivation": "financial", "mitre_group_id": "G0046",
     "description": "Highly capable cybercriminal group targeting POS systems at US restaurant, hospitality, and retail chains with BABYMETAL and Carbanak malware."},
    {"name": "Carbanak", "aliases": ["Cobalt Group", "Anunak", "Gold Niagara"], "origin_country": "RU",
     "motivation": "financial", "mitre_group_id": "G0008",
     "description": "Banking fraud operation that stole over $1 billion from financial institutions by hijacking SWIFT transfers and compromising ATM networks."},
    {"name": "Wizard Spider", "aliases": ["UNC1878", "Gold Ulrick", "Grim Spider"], "origin_country": "RU",
     "motivation": "financial", "mitre_group_id": "G0102",
     "description": "Operator of TrickBot, BazarBackdoor, and Ryuk/Conti ransomware; responsible for attacks on US hospitals during the COVID-19 pandemic."},
    {"name": "LockBit", "aliases": ["ABCD Ransomware", "Gold Mystic", "LockBit Black", "Bitwise Spider"], "origin_country": "RU",
     "motivation": "financial", "mitre_group_id": None,
     "description": "Most prolific RaaS operation of 2021–2024 with thousands of victims globally; partially disrupted by Operation Cronos in February 2024."},
    {"name": "Conti", "aliases": ["Gold Ulrick", "WIZARD SPIDER RaaS"], "origin_country": "RU",
     "motivation": "financial", "mitre_group_id": None,
     "description": "Wizard Spider-linked RaaS that attacked Ireland's HSE and dozens of critical infrastructure operators; disbanded after its Playbook leaked in 2022."},
    {"name": "REvil", "aliases": ["Sodinokibi", "Gold Southfield", "Pinchy Spider"], "origin_country": "RU",
     "motivation": "financial", "mitre_group_id": None,
     "description": "GandCrab successor RaaS behind the Kaseya VSA and JBS Foods attacks; extorted over $200 million before Russian FSB arrests in 2022."},
    {"name": "DarkSide", "aliases": ["BlackMatter", "Gold Waterfall"], "origin_country": "RU",
     "motivation": "financial", "mitre_group_id": None,
     "description": "RaaS group responsible for the Colonial Pipeline attack in May 2021, causing fuel shortages across the US East Coast."},
    {"name": "Cl0p", "aliases": ["TA505", "Lace Tempest", "FIN11", "Gold Tahoe"], "origin_country": "UA",
     "motivation": "financial", "mitre_group_id": None,
     "description": "Ransomware and mass-extortion group that exploited MOVEit, GoAnywhere, and Accellion zero-days to steal data from hundreds of organisations."},
    {"name": "Lapsus$", "aliases": ["DEV-0537", "Strawberry Tempest"], "origin_country": "GB",
     "motivation": "financial", "mitre_group_id": None,
     "description": "Teenage extortion group using SIM swapping and social engineering to breach Microsoft, Samsung, Nvidia, Okta, and Uber."},
    {"name": "TA505", "aliases": ["Hive0065", "Graceful Spider", "Gold Evergreen", "Spandex Tempest"], "origin_country": "RU",
     "motivation": "financial", "mitre_group_id": "G0092",
     "description": "Prolific criminal group distributing Dridex, FlawedAmmyy, and SDBbot via large-scale malspam campaigns targeting banks and retailers."},
    {"name": "Hive", "aliases": ["Hive Ransomware", "Gold Hawthorne"], "origin_country": "RU",
     "motivation": "financial", "mitre_group_id": None,
     "description": "RaaS affiliate targeting healthcare, education, and critical infrastructure; FBI disrupted the group in January 2023 by seizing and decrypting its infrastructure."},
    # --- Other notable groups ---
    {"name": "Scattered Spider", "aliases": ["UNC3944", "Star Fraud", "Octo Tempest", "Muddled Libra"], "origin_country": "US",
     "motivation": "financial", "mitre_group_id": "G1015",
     "description": "English-speaking group using social engineering and SIM swapping to breach large enterprises including MGM Resorts and Caesars Entertainment."},
    {"name": "BlackCat", "aliases": ["ALPHV", "Noberus", "Gold Blazer"], "origin_country": "RU",
     "motivation": "financial", "mitre_group_id": None,
     "description": "Sophisticated Rust-based RaaS operation with triple extortion tactics; disrupted by FBI in December 2023, responsible for the Change Healthcare attack."},
    {"name": "TeamTNT", "aliases": ["TeamTNT"], "origin_country": "DE",
     "motivation": "financial", "mitre_group_id": None,
     "description": "Cloud-focused threat group deploying cryptominers and credential stealers targeting exposed Docker APIs and Kubernetes clusters."},
    {"name": "Equation Group", "aliases": ["Tailored Access Operations", "EQUATION"], "origin_country": "US",
     "motivation": "espionage", "mitre_group_id": "G0020",
     "description": "NSA TAO division responsible for Stuxnet co-development, EternalBlue/EternalRomance exploits, and firmware implants targeting HDD/SSD firmware."},
    {"name": "APT32", "aliases": ["OceanLotus", "Cobalt Kitty", "SeaLotus", "Canvas Cyclone"], "origin_country": "VN",
     "motivation": "espionage", "mitre_group_id": "G0050",
     "description": "Vietnamese state-sponsored group targeting foreign corporations with business interests in Vietnam and ASEAN governments for economic espionage."},
    {"name": "Patchwork", "aliases": ["Dropping Elephant", "Chinastrats", "Hangover Group"], "origin_country": "IN",
     "motivation": "espionage", "mitre_group_id": None,
     "description": "Suspected Indian state actor targeting Chinese and Pakistani government entities and think tanks with QuasarRAT and custom payloads."},
    {"name": "SideWinder", "aliases": ["Rattlesnake", "T-APT-04", "Baby Elephant"], "origin_country": "IN",
     "motivation": "espionage", "mitre_group_id": None,
     "description": "South Asian APT conducting high-volume spearphishing campaigns against Pakistani military, government, and strategic organisations."},
    {"name": "Team PCP", "aliases": ["TeamPCP"], "origin_country": None,
     "motivation": "financial", "mitre_group_id": None,
     "description": "Emerging supply chain actor targeting open source ecosystems (npm, PyPI) and AI/ML platforms. Deploys CanisterWorm — a self-propagating credential-stealer — using audio steganography for C2 evasion and AES-256/RSA-4096 for exfiltration. Known victims include Trivy, KICS, LiteLLM, and Telnyx (2025–2026)."},
]

_CAMPAIGNS = [
    {"name": "Operation Midnight Express", "actor": "APT29", "status": "active", "campaign_type": "spear-phishing",
     "target_sectors": ["government", "defence"], "target_regions": ["US", "UA", "PL"],
     "description": "APT29 credential harvesting campaign targeting NATO-aligned government ministries via spearphishing and password spray."},
    {"name": "ShadowCloud", "actor": "Team PCP", "status": "active", "campaign_type": "supply-chain",
     "target_sectors": ["technology", "cloud", "ai-ml"], "target_regions": ["US", "DE", "GB"],
     "description": "Team PCP infiltration of CI/CD pipelines and open source package registries to inject CanisterWorm into npm and PyPI packages."},
    {"name": "Operation Frozen Horizon", "actor": "BlackCat", "status": "active", "campaign_type": "ransomware",
     "target_sectors": ["healthcare", "finance"], "target_regions": ["US", "AU", "CA"],
     "description": "BlackCat/ALPHV RaaS campaign targeting hospitals and financial institutions with triple extortion and data exfiltration."},
    {"name": "CryptoStorm", "actor": "TeamTNT", "status": "active", "campaign_type": "cryptomining",
     "target_sectors": ["cloud", "technology"], "target_regions": ["US", "JP", "SG"],
     "description": "TeamTNT mass exploitation of exposed Docker APIs and Kubernetes dashboards to deploy XMRig miners across cloud environments."},
    {"name": "Operation Dragonfly", "actor": "Turla", "status": "dormant", "campaign_type": "apt-intrusion",
     "target_sectors": ["energy", "utilities"], "target_regions": ["DE", "FR", "IT"],
     "description": "Turla long-term espionage operation against European energy infrastructure using Snake implants and watering hole attacks."},
    {"name": "PhishKit Pro", "actor": "FIN7", "status": "active", "campaign_type": "phishing",
     "target_sectors": ["finance", "retail"], "target_regions": ["GB", "US", "AU"],
     "description": "FIN7 automated phishing kit operation targeting banking customers at major retail and financial institutions with high-fidelity lure pages."},
    {"name": "Operation Silent Crane", "actor": "APT41", "status": "active", "campaign_type": "apt-intrusion",
     "target_sectors": ["aerospace", "defence"], "target_regions": ["US", "JP", "KR"],
     "description": "APT41 long-term intrusion campaign targeting defence contractors for intellectual property theft via supply chain and zero-day exploitation."},
    {"name": "GridStrike", "actor": "Sandworm", "status": "concluded", "campaign_type": "ics-attack",
     "target_sectors": ["energy", "utilities"], "target_regions": ["UA"],
     "description": "Sandworm destructive attack on Ukrainian power distribution substations using FrostyGoop ICS malware targeting Modbus-connected devices."},
    {"name": "Operation CanisterWorm", "actor": "Team PCP", "status": "active", "campaign_type": "supply-chain",
     "target_sectors": ["technology", "ai-ml", "telecommunications"], "target_regions": ["US", "GB", "AU"],
     "description": "Team PCP targeted attack campaign deploying CanisterWorm against AI/ML infrastructure providers including LiteLLM and Telnyx, using audio steganography to evade detection."},
]

# Each IOC: (type, value, confidence, tags, source, actor_name, campaign_name)
# actor_name and campaign_name may be None for unattributed indicators.
_IOCS = [
    # --- APT29 / Operation Midnight Express ---
    ("ip",          "45.142.212.100",                                                           85, ["c2", "apt29"],               "threat-intel-feed", "APT29",       "Operation Midnight Express"),
    ("domain",      "update-microsoft-security.com",                                            95, ["phishing", "apt29"],          "VirusTotal",        "APT29",       "Operation Midnight Express"),
    ("domain",      "auth.google-login-secure.ru",                                              92, ["credential-harvest", "apt29"],"PhishTank",         "APT29",       "Operation Midnight Express"),
    ("domain",      "s3-upload-cdn.cloudflare-storage.ru",                                      91, ["exfil", "apt29"],             "threat-intel-feed", "APT29",       "Operation Midnight Express"),
    # --- APT28 (unattributed to a campaign in seed) ---
    ("ip",          "91.92.109.196",                                                            75, ["phishing", "apt28"],          "OSINT",             "APT28",       None),
    ("domain",      "telemetry.windowsupdate.info",                                             78, ["c2", "apt28"],                "threat-intel-feed", "APT28",       None),
    # --- Sandworm / GridStrike ---
    ("hash-sha256", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",         95, ["wiper", "sandworm"],          "CISA",              "Sandworm",    "GridStrike"),
    ("url",         "http://185.220.101.47/payload.ps1",                                        92, ["malware-delivery", "powershell"], "URLhaus",       "Sandworm",    "GridStrike"),
    ("ip",          "185.220.101.47",                                                           90, ["tor-exit", "scanning"],       "CISA",              None,          None),
    # --- BlackCat / Operation Frozen Horizon ---
    ("ip",          "194.165.16.77",                                                            80, ["malware-delivery", "blackcat"],"abuse.ch",         "BlackCat",    "Operation Frozen Horizon"),
    ("domain",      "cdn-delivery-secure.net",                                                  88, ["c2", "blackcat"],             "URLhaus",           "BlackCat",    "Operation Frozen Horizon"),
    ("hash-sha256", "3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a",         90, ["ransomware", "blackcat"],     "VirusTotal",        "BlackCat",    "Operation Frozen Horizon"),
    # --- TeamTNT / CryptoStorm ---
    ("ip",          "162.55.214.166",                                                           75, ["scanning", "teamtnt"],        "Shodan",            "TeamTNT",     "CryptoStorm"),
    ("domain",      "docker-metrics-cdn.com",                                                   82, ["c2", "cryptominer", "teamtnt"],"threat-intel-feed","TeamTNT",     "CryptoStorm"),
    # --- APT41 / Operation Silent Crane ---
    ("domain",      "vpn-microsoft-update.net",                                                 87, ["c2", "apt41"],                "threat-intel-feed", "APT41",       "Operation Silent Crane"),
    ("ip",          "103.75.190.12",                                                            84, ["c2", "apt41"],                "OSINT",             "APT41",       "Operation Silent Crane"),
    # --- Lazarus Group (unattributed to a campaign in seed) ---
    ("ip",          "103.199.16.58",                                                            70, ["scanning", "lazarus"],        "internal",          "Lazarus Group", None),
    ("hash-sha256", "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",         85, ["loader", "lazarus"],          "MalwareBazaar",     "Lazarus Group", None),
    # --- Volt Typhoon (pre-positioning, no active campaign in seed) ---
    ("ip",          "23.106.215.76",                                                            80, ["scanning", "volt-typhoon"],   "OSINT",             "Volt Typhoon", None),
    # --- LockBit (unattributed campaign in seed) ---
    ("hash-sha256", "b94f6f125c79e3a5ffaa826f584c10d52ada669e6762051b826b55776d05a8e7",         88, ["ransomware", "lockbit"],      "MalwareBazaar",     "LockBit",     None),
    # --- Generic / unattributed ---
    ("hash-md5",    "5d41402abc4b2a76b9719d911017c592",                                         70, ["dropper"],                    "internal",          None,          None),
    # --- Team PCP / ShadowCloud + Operation CanisterWorm ---
    ("domain",      "pkg.npmjs-registry.workers.dev",                                           85, ["supply-chain", "teampcp"],   "GitHub",            "Team PCP",    "ShadowCloud"),
    ("domain",      "npm-build-utils.workers.dev",                                              88, ["supply-chain", "teampcp"],   "Trend Micro",       "Team PCP",    "ShadowCloud"),
    ("domain",      "pypi-secure-cdn.net",                                                      86, ["supply-chain", "teampcp"],   "Tracebit",          "Team PCP",    "ShadowCloud"),
    ("ip",          "5.161.231.85",                                                             83, ["c2", "teampcp"],             "Trend Micro",       "Team PCP",    "Operation CanisterWorm"),
    ("ip",          "185.56.80.242",                                                            80, ["c2", "teampcp"],             "Tracebit",          "Team PCP",    "Operation CanisterWorm"),
    ("hash-sha256", "c4f3b2a1d9e8f7c6b5a4d3c2b1a0f9e8d7c6b5a4d3c2b1a0f9e8d7c6b5a4d3c2",         93, ["canisterworm", "supply-chain"],"Trend Micro",      "Team PCP",    "Operation CanisterWorm"),
    ("hash-md5",    "d8f6a2e4c1b9f7d5a3e1c8b6d4f2a0e8",                                        88, ["canisterworm", "loader"],     "Tracebit",          "Team PCP",    "Operation CanisterWorm"),
    ("url",         "https://npm-build-utils.workers.dev/install.sh",                           91, ["malware-delivery", "teampcp"],"Trend Micro",      "Team PCP",    "ShadowCloud"),
]

_CVES = [
    # --- 2024 ---
    ("CVE-2024-3400", 10.0, "critical", "PAN-OS OS command injection in GlobalProtect enabling unauthenticated RCE", True, "2024-04-19"),
    ("CVE-2024-1708", 8.8, "high", "ConnectWise ScreenConnect path traversal allowing unauthenticated access", True, "2024-02-29"),
    ("CVE-2024-21762", 9.6, "critical", "Fortinet FortiOS SSL VPN out-of-bounds write enabling unauthenticated RCE", True, "2024-02-20"),
    ("CVE-2023-46805", 8.2, "high", "Ivanti Connect Secure authentication bypass vulnerability", True, "2024-01-31"),
    ("CVE-2024-27198", 9.8, "critical", "JetBrains TeamCity authentication bypass allowing server takeover", True, "2024-03-18"),
    ("CVE-2024-20359", 6.0, "medium", "Cisco ASA persistent local code execution via legacy capabilities", True, "2024-04-24"),
    ("CVE-2024-4577", 9.8, "critical", "PHP CGI argument injection on Windows allowing unauthenticated RCE", True, "2024-06-10"),
    ("CVE-2024-38112", 7.5, "high", "Windows MSHTML platform spoofing vulnerability exploited in the wild", True, "2024-07-09"),
    ("CVE-2024-43572", 7.8, "high", "Microsoft Management Console remote code execution via crafted MSC files", False, None),
    ("CVE-2024-9486", 9.8, "critical", "Kubernetes Image Builder default credentials enabling node access", True, "2024-11-12"),
    ("CVE-2024-26169", 7.8, "high", "Windows Error Reporting Service privilege escalation exploited by ransomware actors", True, "2024-05-14"),
    ("CVE-2024-30051", 7.8, "high", "Windows DWM Core Library elevation of privilege to SYSTEM", True, "2024-05-14"),
    ("CVE-2024-23897", 9.8, "critical", "Jenkins arbitrary file read via CLI leading to unauthenticated RCE", True, "2024-02-20"),
    ("CVE-2024-6387", 8.1, "high", "OpenSSH regreSSHion race condition enabling unauthenticated RCE on Linux", True, "2024-07-08"),
    ("CVE-2024-21893", 8.2, "high", "Ivanti Connect Secure SSRF in SAML component chained with authentication bypass", True, "2024-01-31"),
    ("CVE-2024-38213", 6.5, "medium", "Windows Mark-of-the-Web security feature bypass via crafted files", True, "2024-08-13"),
    ("CVE-2024-47575", 9.8, "critical", "Fortinet FortiManager missing authentication for critical function enabling RCE", True, "2024-11-12"),
    ("CVE-2024-52301", 8.8, "high", "Laravel environment variable injection via query strings enabling RCE", False, None),
    ("CVE-2024-49113", 7.5, "high", "Windows LDAP denial of service via malformed responses crashing domain controllers", False, None),
    ("CVE-2024-1086", 7.8, "high", "Linux kernel use-after-free in netfilter nf_tables enabling local privilege escalation", True, "2024-06-26"),
    ("CVE-2024-21338", 7.8, "high", "Windows AppLocker kernel driver privilege escalation exploited by Lazarus Group", True, "2024-02-13"),
    ("CVE-2024-22024", 8.3, "high", "Ivanti Connect Secure XML external entity injection enabling sensitive file disclosure", True, "2024-02-08"),
    ("CVE-2024-0204", 9.8, "critical", "Fortra GoAnywhere MFT authentication bypass allowing unauthenticated admin account creation", True, "2024-01-22"),
    ("CVE-2024-21410", 9.8, "critical", "Microsoft Exchange Server NTLM relay privilege escalation vulnerability", True, "2024-02-13"),
    ("CVE-2024-23222", 8.8, "high", "Apple WebKit type confusion enabling arbitrary code execution on iOS and macOS", True, "2024-01-22"),
    ("CVE-2024-21887", 9.1, "critical", "Ivanti Connect Secure post-auth command injection chained with CVE-2023-46805", True, "2024-01-10"),
    ("CVE-2024-20353", 8.6, "high", "Cisco ASA denial of service via malformed HTTP management requests", True, "2024-04-24"),
    ("CVE-2024-29988", 8.8, "high", "Windows SmartScreen security feature bypass enabling malicious file execution", True, "2024-04-09"),
    # --- 2023 ---
    ("CVE-2023-44487", 7.5, "high", "HTTP/2 Rapid Reset DDoS amplification attack affecting major cloud platforms", True, "2023-10-10"),
    ("CVE-2023-34362", 9.8, "critical", "MOVEit Transfer SQL injection enabling unauthenticated access and privilege escalation", True, "2023-06-09"),
    ("CVE-2023-0669", 7.2, "high", "Fortra GoAnywhere MFT pre-authentication command injection enabling RCE", True, "2023-02-07"),
    ("CVE-2023-4966", 9.4, "critical", "Citrix NetScaler ADC session token disclosure (Citrix Bleed) enabling unauthenticated session hijacking", True, "2023-10-18"),
    ("CVE-2023-4863", 10.0, "critical", "libWebP heap buffer overflow in WebP image parsing enabling RCE in Chrome and Electron apps", True, "2023-09-11"),
    ("CVE-2023-38831", 7.8, "high", "WinRAR code execution via specially crafted archives spoofing extensions, exploited by APT actors", True, "2023-08-23"),
    ("CVE-2023-38545", 9.8, "critical", "curl SOCKS5 heap-based buffer overflow in proxy hostname resolution", True, "2023-10-11"),
    ("CVE-2023-22518", 9.1, "critical", "Atlassian Confluence improper authorization enabling data destruction without authentication", True, "2023-11-06"),
    ("CVE-2023-20269", 9.1, "critical", "Cisco ASA/FTD unauthorized remote access enabling VPN session establishment without credentials", True, "2023-09-06"),
    ("CVE-2023-27997", 9.8, "critical", "Fortinet FortiOS/FortiProxy SSL VPN heap overflow enabling pre-auth RCE", True, "2023-06-13"),
    ("CVE-2023-2868", 9.4, "critical", "Barracuda Email Security Gateway OS command injection exploited as zero-day since 2022", True, "2023-10-23"),
    ("CVE-2023-42793", 9.8, "critical", "JetBrains TeamCity authentication bypass enabling admin account takeover", True, "2023-10-04"),
    ("CVE-2023-36025", 8.8, "high", "Windows SmartScreen bypass via crafted Internet Shortcut files used by QakBot/Phemedrone", True, "2023-11-14"),
    ("CVE-2023-29357", 9.8, "critical", "Microsoft SharePoint Server privilege escalation via spoofed JWT authentication tokens", True, "2023-10-10"),
    ("CVE-2023-36884", 8.3, "high", "Windows Search remote code execution via Office documents (exploited by Storm-0978/RomCom)", True, "2023-08-08"),
    ("CVE-2023-46604", 10.0, "critical", "Apache ActiveMQ unauthenticated RCE via ClassInfo OpenWire protocol command", True, "2023-11-02"),
    ("CVE-2023-28252", 7.8, "high", "Windows Common Log File System Driver privilege escalation exploited by Nokoyawa ransomware", True, "2023-04-11"),
    ("CVE-2023-21716", 9.8, "critical", "Microsoft Word heap corruption via RTF file enabling unauthenticated RCE", True, "2023-03-14"),
    ("CVE-2023-35708", 9.8, "critical", "MOVEit Transfer additional SQL injection in HTTP POST handler (second wave)", True, "2023-06-15"),
    ("CVE-2023-23376", 7.8, "high", "Windows Common Log File System Driver elevation of privilege to SYSTEM", True, "2023-02-14"),
    # --- 2022 ---
    ("CVE-2022-30190", 7.8, "high", "Microsoft MSDT Follina code execution via Office documents without macros", True, "2022-06-14"),
    ("CVE-2022-22965", 9.8, "critical", "Spring Framework Spring4Shell RCE via ClassLoader manipulation on JDK 9+", True, "2022-04-11"),
    ("CVE-2022-26134", 9.8, "critical", "Atlassian Confluence OGNL injection enabling unauthenticated RCE, mass-exploited within hours", True, "2022-06-02"),
    ("CVE-2022-1388", 9.8, "critical", "F5 BIG-IP iControl REST authentication bypass enabling unauthenticated command execution", True, "2022-05-10"),
    ("CVE-2022-40684", 9.8, "critical", "Fortinet FortiOS/FortiProxy authentication bypass via crafted HTTP/HTTPS requests", True, "2022-10-18"),
    ("CVE-2022-41082", 8.8, "high", "Microsoft Exchange Server RCE (ProxyNotShell) via PowerShell remoting post-auth", True, "2022-11-08"),
    ("CVE-2022-41040", 8.8, "high", "Microsoft Exchange Server SSRF (ProxyNotShell) enabling privilege escalation to SYSTEM", True, "2022-11-08"),
    ("CVE-2022-42475", 9.3, "critical", "Fortinet FortiOS SSL VPN heap-based buffer overflow enabling unauthenticated RCE", True, "2022-12-12"),
    ("CVE-2022-27518", 9.8, "critical", "Citrix ADC/NetScaler Gateway unauthenticated RCE exploited by APT5", True, "2022-12-13"),
    ("CVE-2022-47966", 9.8, "critical", "Zoho ManageEngine multiple products pre-auth RCE via SAML SSO component", True, "2023-01-17"),
    ("CVE-2022-24521", 7.8, "high", "Windows Common Log File System Driver elevation of privilege to SYSTEM", True, "2022-04-12"),
    ("CVE-2022-30525", 9.8, "critical", "Zyxel firewall OS command injection enabling unauthenticated RCE via HTTP", True, "2022-05-12"),
    ("CVE-2022-0847", 7.8, "high", "Linux kernel Dirty Pipe privilege escalation via pipe buffer overwrite (affects 5.8+)", True, "2022-03-07"),
    ("CVE-2022-3236", 9.8, "critical", "Sophos Firewall code injection in User Portal enabling pre-auth RCE", True, "2022-09-23"),
    ("CVE-2022-22963", 9.8, "critical", "Spring Cloud Function SpEL injection enabling unauthenticated RCE via routing expressions", True, "2022-04-04"),
    # --- 2021 ---
    ("CVE-2021-44228", 10.0, "critical", "Apache Log4j2 JNDI injection via user-supplied log data enabling unauthenticated RCE (Log4Shell)", True, "2021-12-10"),
    ("CVE-2021-45046", 9.0, "critical", "Apache Log4j2 Log4Shell bypass via thread context lookup enabling JNDI injection", True, "2021-12-18"),
    ("CVE-2021-26855", 9.8, "critical", "Microsoft Exchange Server SSRF (ProxyLogon) enabling pre-auth RCE when chained", True, "2021-03-17"),
    ("CVE-2021-27065", 7.8, "high", "Microsoft Exchange Server arbitrary file write (ProxyLogon chain) enabling webshell deployment", True, "2021-03-17"),
    ("CVE-2021-34527", 8.8, "high", "Windows Print Spooler RCE (PrintNightmare) enabling domain privilege escalation", True, "2021-07-13"),
    ("CVE-2021-34473", 9.8, "critical", "Microsoft Exchange Server path confusion (ProxyShell) enabling SSRF without authentication", True, "2021-09-15"),
    ("CVE-2021-31207", 7.2, "high", "Microsoft Exchange Server arbitrary file write (ProxyShell chain) to SYSTEM", True, "2021-09-15"),
    ("CVE-2021-40444", 8.8, "high", "Microsoft MSHTML remote code execution via malicious Office documents (used by APT actors)", True, "2021-09-15"),
    ("CVE-2021-22005", 9.8, "critical", "VMware vCenter Server arbitrary file upload enabling unauthenticated RCE", True, "2021-09-21"),
    ("CVE-2021-26084", 9.8, "critical", "Atlassian Confluence OGNL injection enabling unauthenticated RCE, mass-exploited for cryptomining", True, "2021-09-01"),
    ("CVE-2021-21985", 9.8, "critical", "VMware vCenter Server plugin RCE via vSphere Client with no authentication required", True, "2021-05-25"),
    ("CVE-2021-44077", 9.8, "critical", "Zoho ManageEngine ServiceDesk Plus file upload enabling unauthenticated RCE", True, "2021-11-22"),
    # --- 2020 ---
    ("CVE-2020-1472", 10.0, "critical", "Windows Netlogon ZeroLogon privilege escalation enabling domain controller takeover", True, "2020-09-18"),
    ("CVE-2020-14882", 9.8, "critical", "Oracle WebLogic Server unauthenticated RCE via HTTP without authentication", True, "2020-11-18"),
    ("CVE-2020-5902", 9.8, "critical", "F5 BIG-IP TMUI unauthenticated RCE via directory traversal", True, "2022-03-07"),
    # --- Legacy / foundational exploits ---
    ("CVE-2019-19781", 9.8, "critical", "Citrix ADC/NetScaler arbitrary code execution via path traversal without authentication", True, "2022-03-07"),
    ("CVE-2017-0144", 8.1, "high", "Windows SMB remote code execution via EternalBlue, used in WannaCry and NotPetya campaigns", True, "2022-05-04"),
]

_NEWS = [
    ("CISA Warns of Active Exploitation of Ivanti VPN Vulnerabilities",
     "https://www.cisa.gov/news-events/alerts/2024/01/10/cisa-warns-ivanti",
     "CISA", ["APT29", "Volt Typhoon"], ["CVE-2023-46805", "CVE-2024-21893"],
     "CISA issued an emergency directive requiring federal agencies to mitigate actively exploited vulnerabilities in Ivanti Connect Secure and Policy Secure products."),
    ("Midnight Blizzard Targets Microsoft Corporate Email via Password Spray",
     "https://msrc.microsoft.com/blog/2024/01/midnight-blizzard-attack",
     "Microsoft MSRC", ["APT29"], [],
     "Microsoft disclosed that Midnight Blizzard (APT29) used password spray attacks to access a legacy test tenant, gaining access to senior leadership email accounts."),
    ("BlackCat Ransomware Claims Attack on Change Healthcare",
     "https://krebsonsecurity.com/2024/02/blackcat-change-healthcare",
     "KrebsOnSecurity", ["BlackCat"], [],
     "The BlackCat/ALPHV ransomware gang claimed responsibility for a crippling attack on Change Healthcare, disrupting prescription processing across the US."),
    ("New PAN-OS Zero-Day Exploited in the Wild Before Patch Release",
     "https://unit42.paloaltonetworks.com/cve-2024-3400",
     "Palo Alto Unit 42", [], ["CVE-2024-3400"],
     "A critical command injection vulnerability in Palo Alto GlobalProtect was exploited as a zero-day by a nation-state threat actor before a patch was available."),
    ("TeamTNT Returns with Upgraded Cloud-Native Attack Toolkit",
     "https://blog.aquasec.com/teamtnt-cloud-attacks-2024",
     "Aqua Security", ["TeamTNT"], [],
     "TeamTNT reappeared targeting Kubernetes clusters and Docker APIs with an upgraded toolkit including new evasion techniques and a faster XMRig deployment."),
    ("Supply Chain Attack Targets NPM Packages Used by Thousands",
     "https://thehackernews.com/2024/supply-chain-npm",
     "The Hacker News", ["APT41"], [],
     "Researchers discovered a sophisticated supply chain attack embedding credential-stealing code in popular NPM packages with over 50,000 weekly downloads."),
    ("Scattered Spider Indicted: Five Members Face Federal Charges",
     "https://www.justice.gov/usao-cdca/scattered-spider-indictment",
     "US DOJ", ["Scattered Spider"], [],
     "The US DOJ announced indictments against five alleged members of Scattered Spider for wire fraud, identity theft, and conspiracy in attacks against MGM, Caesars, and others."),
    ("regreSSHion: Critical OpenSSH Vulnerability Affects Millions of Servers",
     "https://blog.qualys.com/regresshion-cve-2024-6387",
     "Qualys", [], ["CVE-2024-6387"],
     "Qualys disclosed a race condition in OpenSSH that allows unauthenticated remote code execution as root on glibc-based Linux systems. Estimated 14 million internet-exposed servers affected."),
    ("Volt Typhoon Pre-Positioned in US Critical Infrastructure for Years",
     "https://www.cisa.gov/news-events/cybersecurity-advisories/aa24-038a",
     "CISA/NSA", ["Volt Typhoon"], [],
     "A joint advisory from CISA, NSA, and FBI confirmed Volt Typhoon has maintained persistent access to US critical infrastructure — including water, energy, and transport — for up to five years."),
    ("Fortinet FortiManager Zero-Day Exploited Before Disclosure",
     "https://www.fortinet.com/blog/psirt/cve-2024-47575",
     "Fortinet PSIRT", [], ["CVE-2024-47575"],
     "Fortinet disclosed a critical vulnerability in FortiManager that was exploited as a zero-day before the patch was released, allowing unauthenticated actors to execute arbitrary code."),
    ("JetBrains TeamCity Mass Exploitation Underway After Patch Release",
     "https://blog.jetbrains.com/teamcity/2024/03/critical-security-patch",
     "JetBrains", [], ["CVE-2024-27198"],
     "Within hours of patch release for a critical TeamCity authentication bypass, threat actors began mass exploitation to deploy web shells and backdoors on vulnerable servers."),
    ("Lazarus Group Targets Crypto Exchanges with New macOS Malware",
     "https://objective-see.org/blog/blog_0x78.html",
     "Objective-See", ["Lazarus Group"], [],
     "Lazarus Group deployed a new macOS backdoor disguised as a cryptocurrency trading app, targeting employees at crypto exchanges and blockchain firms."),
    ("CISA Releases KEV Catalog Update with 10 New Exploited Vulnerabilities",
     "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
     "CISA", [], [],
     "CISA added 10 new entries to the Known Exploited Vulnerabilities catalog, including flaws in Cisco ASA, Palo Alto, and Microsoft products with active exploitation evidence."),
    ("PHP CGI Argument Injection Exploited for Cryptomining on Windows IIS",
     "https://blog.sucuri.net/2024/06/cve-2024-4577-exploitation",
     "Sucuri", [], ["CVE-2024-4577"],
     "Security researchers observed mass exploitation of the PHP CGI vulnerability within 24 hours of disclosure, with attackers deploying XMRig cryptominers on vulnerable Windows IIS servers."),
    ("Sandworm Deploys FrostyGoop ICS Malware Against Ukrainian Heating Systems",
     "https://www.dragos.com/blog/frostygoop-ics-malware",
     "Dragos", ["Sandworm"], [],
     "Dragos discovered FrostyGoop, a novel ICS-focused malware used by Sandworm to attack Modbus-connected heating infrastructure in Lviv, Ukraine during winter 2024."),
]

_HEATMAP_ORIGINS = [
    ("RU", 55.7558, 37.6176, 142),
    ("CN", 39.9042, 116.4074, 98),
    ("KP", 39.0392, 125.7625, 45),
    ("IR", 35.6892, 51.3890, 38),
    ("US", 38.9072, -77.0369, 28),
    ("DE", 52.5200, 13.4050, 22),
    ("BR", -15.7801, -47.9292, 18),
    ("IN", 28.6139, 77.2090, 15),
    ("NG", 9.0765, 7.3986, 12),
    ("RO", 44.4268, 26.1025, 10),
]


async def seed_if_empty() -> None:
    if not settings.seed_on_empty:
        return
    async with AsyncSessionLocal() as db:
        actor_count = await db.scalar(select(func.count()).select_from(Actor))
        if actor_count and actor_count > 0:
            return

        logger.info("Seeding database with initial threat intel data...")
        now = datetime.now(timezone.utc)

        actor_objs: list[Actor] = []
        for i, a in enumerate(_ACTORS):
            actor_objs.append(Actor(
                name=a["name"],
                aliases=a["aliases"],
                origin_country=a["origin_country"],
                motivation=a["motivation"],
                description=a["description"],
                mitre_group_id=a["mitre_group_id"],
                first_seen=now - timedelta(days=365 * (3 + i % 5)),
                last_seen=now - timedelta(days=i * 7),
                source="seed",
            ))
        db.add_all(actor_objs)
        await db.flush()

        actor_by_name = {a.name: a for a in actor_objs}

        campaign_objs: list[Campaign] = []
        campaign_by_name: dict[str, Campaign] = {}
        for i, c in enumerate(_CAMPAIGNS):
            actor = actor_by_name.get(c["actor"]) if c.get("actor") else None
            campaign = Campaign(
                name=c["name"],
                actor_id=actor.id if actor else None,
                status=c["status"],
                campaign_type=c["campaign_type"],
                target_sectors=c["target_sectors"],
                target_regions=c["target_regions"],
                description=c["description"],
                start_date=now - timedelta(days=90 + i * 15),
                end_date=None if c["status"] != "concluded" else now - timedelta(days=30),
                source="seed",
            )
            campaign_objs.append(campaign)
            campaign_by_name[c["name"]] = campaign
        db.add_all(campaign_objs)
        await db.flush()

        ioc_objs: list[IOC] = []
        for i, (ioc_type, value, confidence, tags, source, actor_name, campaign_name) in enumerate(_IOCS):
            actor = actor_by_name.get(actor_name) if actor_name else None
            campaign = campaign_by_name.get(campaign_name) if campaign_name else None
            ioc_objs.append(IOC(
                type=ioc_type,
                value=value,
                confidence=confidence,
                first_seen=now - timedelta(days=30 + i * 3),
                last_seen=now - timedelta(hours=i * 12),
                actor_id=actor.id if actor else None,
                campaign_id=campaign.id if campaign else None,
                source=source,
                tags=tags,
            ))
        db.add_all(ioc_objs)

        cve_objs: list[CVE] = []
        for cve_id, score, severity, desc, kev, due in _CVES:
            cve_objs.append(CVE(
                cve_id=cve_id,
                description=desc,
                cvss_score=score,
                severity=severity,
                kev_status=kev,
                kev_due_date=datetime.strptime(due, "%Y-%m-%d").date() if due else None,
                published_at=now - timedelta(days=30),
                exploit_maturity="active" if kev else "PoC",
                source="seed",
            ))
        db.add_all(cve_objs)

        news_objs: list[NewsArticle] = []
        for i, (title, url, src, actors, cves, summary) in enumerate(_NEWS):
            news_objs.append(NewsArticle(
                title=title,
                url=url,
                source_name=src,
                published_at=now - timedelta(hours=i * 18),
                summary=summary,
                extracted_actors=actors,
                extracted_cves=cves,
                tags=["threat-intel"],
            ))
        db.add_all(news_objs)

        # Seed default feeds
        feeds = [
            # --- Already-implemented types ---
            Feed(
                name="CISA Known Exploited Vulnerabilities",
                feed_type="cisa_kev",
                url="https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
                enabled=True,
                poll_interval_hours=24,
            ),
            Feed(
                name="Krebs on Security",
                feed_type="rss",
                url="https://krebsonsecurity.com/feed/",
                enabled=True,
                poll_interval_hours=6,
            ),
            Feed(
                name="The Hacker News",
                feed_type="rss",
                url="https://feeds.feedburner.com/TheHackersNews",
                enabled=True,
                poll_interval_hours=6,
            ),
            Feed(
                name="Bleeping Computer",
                feed_type="rss",
                url="https://www.bleepingcomputer.com/feed/",
                enabled=True,
                poll_interval_hours=6,
            ),
            # --- New RSS feeds ---
            Feed(
                name="Cybercrime Tracker",
                feed_type="rss",
                url="http://cybercrime-tracker.net/rss.xml",
                enabled=True,
                poll_interval_hours=6,
            ),
            Feed(
                name="Wiz Cloud Threat Landscape",
                feed_type="rss",
                url="https://www.wiz.io/api/feed/cloud-threat-landscape/rss.xml",
                enabled=True,
                poll_interval_hours=6,
            ),
            Feed(
                name="Wiz Cloud Threat Landscape (STIX)",
                feed_type="wiz_stix",
                url="https://www.wiz.io/api/feed/cloud-threat-landscape/stix.json",
                enabled=True,
                poll_interval_hours=24,
            ),
            # --- IOC feeds ---
            Feed(
                name="Abuse.ch URLhaus IOCs",
                feed_type="urlhaus_iocs",
                url="https://urlhaus.abuse.ch/downloads/csv_recent/",
                enabled=True,
                poll_interval_hours=6,
            ),
            Feed(
                name="URLHaus Recent Payloads",
                feed_type="urlhaus_api",
                url="https://urlhaus-api.abuse.ch/v1/payloads/recent/",
                enabled=True,
                poll_interval_hours=6,
            ),
            # --- Actor/CVE enrichment ---
            Feed(
                name="MITRE ATT&CK Enterprise",
                feed_type="mitre_attack",
                url="https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json",
                enabled=True,
                poll_interval_hours=168,
            ),
            Feed(
                name="NVD CVE (Recent)",
                feed_type="nvd_cve",
                url="https://services.nvd.nist.gov/rest/json/cves/2.0",
                enabled=True,
                poll_interval_hours=24,
            ),
            # --- Key-required feeds (disabled until key is added via UI) ---
            Feed(
                name="AlienVault OTX",
                feed_type="alienvault_otx",
                url="https://otx.alienvault.com/api/v1/pulses/subscribed",
                enabled=False,
                poll_interval_hours=6,
            ),
            Feed(
                name="Shodan",
                feed_type="shodan",
                url="https://api.shodan.io/shodan/host/search",
                enabled=False,
                poll_interval_hours=24,
            ),
            Feed(
                name="Malpedia",
                feed_type="malpedia",
                url="https://malpedia.caad.fkie.fraunhofer.de/api/list/actors",
                enabled=True,
                poll_interval_hours=168,
            ),
            # --- Deprecated / future feeds (disabled) ---
            Feed(
                name="Abuse.ch SSL Blacklist",
                feed_type="ssl_blacklist",
                url="https://sslbl.abuse.ch/blacklist/sslipblacklist.csv",
                enabled=False,
                poll_interval_hours=24,
            ),
            Feed(
                name="DISARM Framework",
                feed_type="disarm",
                url="https://raw.githubusercontent.com/DISARMFoundation/DISARMframeworks/main/generated_files/DISARM_STIX/DISARM.json",
                enabled=False,
                poll_interval_hours=168,
            ),
            Feed(
                name="APT Campaign Collection",
                feed_type="apt_campaigns",
                url="https://github.com/CyberMonitor/APT_CyberCriminal_Campagin_Collections",
                enabled=False,
                poll_interval_hours=168,
            ),
        ]
        db.add_all(feeds)

        def _ids(*names: str, src: dict) -> list[str]:
            return [str(src[n].id) for n in names if n in src]

        report_objs = [
            Report(
                title="APT29 Campaign Analysis: Operation Midnight Express",
                description=(
                    "Comprehensive intelligence product covering APT29's recent phishing and C2 "
                    "infrastructure used in the Midnight Express campaign targeting Western government "
                    "email accounts. Includes IOC correlation, TTP mapping, and mitigation guidance."
                ),
                status="published",
                tlp_level="amber",
                author="Lookout Threat Intelligence",
                published_at=now - timedelta(days=10),
                actor_ids=_ids("APT29", src=actor_by_name),
                campaign_ids=_ids("Operation Midnight Express", src=campaign_by_name),
                ioc_ids=[],
                cve_ids=[],
            ),
            Report(
                title="Ransomware Threat Landscape Q1 2024",
                description=(
                    "Quarterly assessment of active ransomware campaigns including BlackCat/ALPHV and "
                    "LockBit operations, with IOC correlation and CISA KEV coverage. Triple-extortion "
                    "tactics observed against healthcare and financial sectors."
                ),
                status="published",
                tlp_level="white",
                author="Lookout Threat Intelligence",
                published_at=now - timedelta(days=30),
                actor_ids=_ids("BlackCat", "LockBit", src=actor_by_name),
                campaign_ids=_ids("Operation Frozen Horizon", src=campaign_by_name),
                ioc_ids=[],
                cve_ids=[],
            ),
            Report(
                title="Supply Chain Attack Attribution: Team PCP",
                description=(
                    "Draft intelligence report on Team PCP's CanisterWorm campaign targeting npm and "
                    "PyPI registries. Audio steganography C2 evasion technique documented. "
                    "Attribution pending additional correlation with known DPRK-adjacent TTPs."
                ),
                status="draft",
                tlp_level="red",
                author="Lookout Threat Intelligence",
                published_at=None,
                actor_ids=_ids("Team PCP", src=actor_by_name),
                campaign_ids=_ids("ShadowCloud", "Operation CanisterWorm", src=campaign_by_name),
                ioc_ids=[],
                cve_ids=[],
            ),
            Report(
                title="Critical Infrastructure Targeting by Nation-State Actors",
                description=(
                    "Draft threat advisory on Volt Typhoon and Sandworm pre-positioning in critical "
                    "infrastructure. Documents ICS-specific TTPs including FrostyGoop Modbus malware "
                    "and living-off-the-land techniques used to evade EDR."
                ),
                status="draft",
                tlp_level="green",
                author="Lookout Threat Intelligence",
                published_at=None,
                actor_ids=_ids("Volt Typhoon", "Sandworm", src=actor_by_name),
                campaign_ids=_ids("GridStrike", src=campaign_by_name),
                ioc_ids=[],
                cve_ids=[],
            ),
        ]
        db.add_all(report_objs)

        await db.commit()
        logger.info("Database seeded successfully.")
