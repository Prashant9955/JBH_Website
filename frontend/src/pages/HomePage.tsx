import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./home.css";

type ContactState = "idle" | "sending" | "sent";

export function HomePage() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const [contactState, setContactState] = useState<ContactState>("idle");

  useEffect(() => {
    // Custom cursor + trailing ring (matches original UX)
    const cursor = cursorRef.current;
    const ring = ringRef.current;
    if (!cursor || !ring) return;

    let mx = 0;
    let my = 0;
    let rx = 0;
    let ry = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };
    window.addEventListener("mousemove", onMove);

    let raf = 0;
    const animate = () => {
      cursor.style.transform = `translate(${mx - 5}px, ${my - 5}px)`;
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.transform = `translate(${rx - 18}px, ${ry - 18}px)`;
      raf = window.requestAnimationFrame(animate);
    };
    raf = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const navbar = document.getElementById("navbar");
    const onScroll = () => {
      navbar?.classList.toggle("scrolled", window.scrollY > 60);

      const sections = document.querySelectorAll("section[id]");
      const links = document.querySelectorAll<HTMLAnchorElement>(".nav-links a");
      let current = "";
      sections.forEach((s) => {
        if (window.scrollY >= (s as HTMLElement).offsetTop - 100) current = s.id;
      });
      links.forEach((l) => {
        l.classList.remove("active");
        if (l.getAttribute("href") === `#${current}`) l.classList.add("active");
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const ham = document.getElementById("hamburger");
    const mobileNav = document.getElementById("mobileNav");
    const toggle = () => mobileNav?.classList.toggle("open");
    ham?.addEventListener("click", toggle);
    mobileNav?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => mobileNav.classList.remove("open")));
    return () => ham?.removeEventListener("click", toggle);
  }, []);

  useEffect(() => {
    const reveals = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    reveals.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const seatObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll<HTMLElement>(".seat-bar-fill").forEach((bar) => {
              const w = bar.getAttribute("data-width");
              window.setTimeout(() => {
                bar.style.width = `${w}%`;
              }, 300);
            });
            seatObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    document.querySelectorAll(".seats-grid").forEach((el) => seatObserver.observe(el));
    return () => seatObserver.disconnect();
  }, []);

  useEffect(() => {
    function animateCounter(el: HTMLElement, target: number, duration = 1500) {
      let start = 0;
      const step = target / (duration / 16);
      const update = () => {
        start = Math.min(start + step, target);
        const suffix = (el as HTMLElement).dataset.suffix ?? "";
        el.textContent = `${Math.floor(start)}${suffix}`;
        if (start < target) requestAnimationFrame(update);
      };
      requestAnimationFrame(update);
    }

    const statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll<HTMLElement>(".stat-num").forEach((num) => {
              const raw = num.textContent ?? "0";
              const val = parseInt(raw, 10);
              const suffix = raw.replace(/[0-9]/g, "");
              num.dataset.suffix = suffix;
              animateCounter(num, Number.isFinite(val) ? val : 0);
            });
            statsObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    document.querySelectorAll(".hero-stats").forEach((el) => statsObserver.observe(el));
    return () => statsObserver.disconnect();
  }, []);

  const contactBtnText = useMemo(() => {
    if (contactState === "sending") return "Sending…";
    if (contactState === "sent") return "Message Sent!";
    return "Send Message";
  }, [contactState]);

  async function onContactSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (contactState === "sending") return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      query_type: String(formData.get("query_type") ?? ""),
      message: String(formData.get("message") ?? ""),
    };

    setContactState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { success: boolean; message?: string };
      if (!data.success) throw new Error(data.message ?? "Failed to send. Try again.");
      setContactState("sent");
      form.reset();
      window.setTimeout(() => setContactState("idle"), 3000);
    } catch (err) {
      setContactState("idle");
      alert(err instanceof Error ? err.message : "Connection error. Please try again.");
    }
  }

  return (
    <div>
      <div className="cursor" id="cursor" ref={cursorRef} />
      <div className="cursor-ring" id="cursorRing" ref={ringRef} />

      <div className="mobile-nav" id="mobileNav">
        <a href="#home">Home</a>
        <a href="#about">About</a>
        <a href="#facilities">Facilities</a>
        <a href="#notices">Notices</a>
        <a href="#seats">Seats</a>
        <a href="#rules">Rules</a>
        <a href="#contact">Contact</a>
        <Link
          to="/login"
          className="nav-cta"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "1.2rem",
            color: "var(--gold)",
            background: "var(--ink)",
            padding: "12px 28px",
            borderRadius: "4px",
            textDecoration: "none",
          }}
        >
          Login →
        </Link>
      </div>

      <nav id="navbar">
        <a href="#home" className="nav-logo">
          <div className="nav-logo-badge">JBH</div>
          <div>
            <div className="nav-logo-text">Junior Boys Hostel</div>
            <div className="nav-logo-sub">DEI · Agra · Est. 1981</div>
          </div>
        </a>
        <ul className="nav-links">
          <li>
            <a href="#home" className="active">
              Home
            </a>
          </li>
          <li>
            <a href="#about">About</a>
          </li>
          <li>
            <a href="#facilities">Facilities</a>
          </li>
          <li>
            <a href="#notices">Notices</a>
          </li>
          <li>
            <a href="#seats">Seats</a>
          </li>
          <li>
            <a href="#rules">Rules</a>
          </li>
          <li>
            <a href="#contact">Contact</a>
          </li>
          <li>
            <Link to="/login" className="nav-cta">
              Login →
            </Link>
          </li>
        </ul>
        <div className="hamburger" id="hamburger">
          <span />
          <span />
          <span />
        </div>
      </nav>

      {/* Hero */}
      <section className="hero" id="home">
        <div className="hero-bg-lines">
          <div className="vline" />
          <div className="vline" />
          <div className="vline" />
        </div>

        <div className="hero-content">
          <div className="hero-eyebrow">
            <span />
            Dayalbagh Educational Institute · Agra
          </div>
          <h1 className="hero-title">
            Junior
            <span className="accent">Boys</span>
            <span className="italic-serif">Hostel</span>
          </h1>
          <p className="hero-desc">
            A home away from home. Where scholars grow, friendships deepen, and futures are built — at the heart of DEI
            Agra&apos;s storied campus.
          </p>
          <div className="hero-actions">
            <a href="#seats" className="btn-primary">
              <i className="fas fa-door-open" /> Check Availability
            </a>
            <a href="#facilities" className="btn-secondary">
              Explore Facilities <i className="fas fa-arrow-right" />
            </a>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-num">240</span>
              <span className="stat-label">Total Seats</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num">40+</span>
              <span className="stat-label">Years Legacy</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num">12</span>
              <span className="stat-label">Facilities</span>
            </div>
          </div>
        </div>

        {/* Visual is the same as original; kept intact for UI parity */}
        <div className="hero-visual">
          <div className="hero-card-main">
            <div className="card-img-placeholder">
              <div className="hostel-illustration">
                {/* SVG building illustration copied from original index.html */}
                <svg className="building-svg" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0a1628" />
                      <stop offset="100%" stopColor="#0d3344" />
                    </linearGradient>
                    <linearGradient id="gold-glow" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#c8973a" stopOpacity="0" />
                      <stop offset="50%" stopColor="#c8973a" />
                      <stop offset="100%" stopColor="#c8973a" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <rect width="400" height="300" fill="url(#sky)" />
                  <circle cx="50" cy="30" r="1" fill="white" opacity="0.6" />
                  <circle cx="120" cy="20" r="1.5" fill="white" opacity="0.8" />
                  <circle cx="200" cy="15" r="1" fill="white" opacity="0.5" />
                  <circle cx="300" cy="25" r="1" fill="white" opacity="0.7" />
                  <circle cx="370" cy="40" r="1.5" fill="white" opacity="0.6" />
                  <circle cx="80" cy="55" r="1" fill="white" opacity="0.4" />
                  <circle cx="340" cy="10" r="1" fill="white" opacity="0.5" />
                  <circle cx="340" cy="50" r="18" fill="#e8d5a0" opacity="0.9" />
                  <circle cx="348" cy="45" r="13" fill="#0a1628" />
                  <rect x="0" y="240" width="400" height="60" fill="#0d1f0d" opacity="0.8" />
                  <rect x="60" y="100" width="280" height="145" fill="#1a2a1a" />
                  <rect x="60" y="100" width="280" height="145" fill="url(#sky)" opacity="0.3" />
                  <rect x="55" y="93" width="290" height="10" fill="#2a3a2a" />
                  <polygon points="60,93 200,50 340,93" fill="#1e2e1e" />
                  <line x1="200" y1="50" x2="200" y2="20" stroke="#c8973a" strokeWidth="1.5" />
                  <polygon points="200,20 225,28 200,36" fill="#c8973a" />
                  <rect x="80" y="180" width="35" height="35" rx="2" fill="#c8973a" opacity="0.15" />
                  <rect x="133" y="180" width="35" height="35" rx="2" fill="#c8973a" opacity="0.8" />
                  <rect x="186" y="180" width="35" height="35" rx="2" fill="#c8973a" opacity="0.4" />
                  <rect x="239" y="180" width="35" height="35" rx="2" fill="#c8973a" opacity="0.9" />
                  <rect x="292" y="180" width="35" height="35" rx="2" fill="#c8973a" opacity="0.2" />
                  <rect x="80" y="130" width="35" height="30" rx="2" fill="#c8973a" opacity="0.7" />
                  <rect x="133" y="130" width="35" height="30" rx="2" fill="#c8973a" opacity="0.3" />
                  <rect x="186" y="130" width="35" height="30" rx="2" fill="#c8973a" opacity="0.9" />
                  <rect x="239" y="130" width="35" height="30" rx="2" fill="#c8973a" opacity="0.5" />
                  <rect x="292" y="130" width="35" height="30" rx="2" fill="#c8973a" opacity="0.8" />
                  <rect x="174" y="210" width="52" height="35" rx="3" fill="#c8973a" opacity="0.9" />
                  <circle cx="220" cy="230" r="3" fill="#0a1628" />
                  <rect x="165" y="243" width="70" height="6" rx="1" fill="#2a3a2a" />
                  <rect x="158" y="247" width="84" height="6" rx="1" fill="#1a2a1a" />
                  <rect x="100" y="100" width="8" height="145" fill="#2a3a2a" />
                  <rect x="180" y="100" width="8" height="145" fill="#2a3a2a" />
                  <rect x="212" y="100" width="8" height="145" fill="#2a3a2a" />
                  <rect x="292" y="100" width="8" height="145" fill="#2a3a2a" />
                  <rect x="22" y="210" width="6" height="34" fill="#1a2a1a" />
                  <circle cx="25" cy="205" r="20" fill="#0d2a0d" opacity="0.9" />
                  <circle cx="25" cy="195" r="15" fill="#153a15" opacity="0.8" />
                  <rect x="372" y="210" width="6" height="34" fill="#1a2a1a" />
                  <circle cx="375" cy="205" r="20" fill="#0d2a0d" opacity="0.9" />
                  <circle cx="375" cy="195" r="15" fill="#153a15" opacity="0.8" />
                  <path d="M174 253 L100 300 L300 300 L226 253 Z" fill="#1a1a0d" opacity="0.6" />
                  <rect x="60" y="235" width="280" height="2" fill="url(#gold-glow)" opacity="0.6" />
                  <text
                    x="200"
                    y="170"
                    fontSize="12"
                    fill="rgba(200,151,58,0.3)"
                    textAnchor="middle"
                    fontFamily="serif"
                    letterSpacing="4"
                  >
                    D · E · I
                  </text>
                </svg>
              </div>
            </div>
            <div className="hero-card-overlay">
              <h3>Junior Boys Hostel, Block A</h3>
              <p>Established 1981 · Agra Campus</p>
            </div>
          </div>
          <div className="hero-card-row">
            <div className="mini-card">
              <div className="mini-card-icon" style={{ background: "#f0fdf4" }}>
                <i className="fas fa-utensils" style={{ color: "#22c55e" }} />
              </div>
              <h4>Mess Facility</h4>
              <p>Nutritious meals served 3 times daily</p>
            </div>
            <div className="mini-card">
              <div className="mini-card-icon" style={{ background: "#fffbeb" }}>
                <i className="fas fa-wifi" style={{ color: "#f59e0b" }} />
              </div>
              <h4>Wi-Fi Campus</h4>
              <p>High-speed internet throughout</p>
            </div>
          </div>
        </div>
      </section>

      {/* Ticker */}
      <div className="ticker">
        <div className="ticker-inner" id="ticker">
          <div className="ticker-item">
            <span className="dot" />
            New Admission Open for 2025–26
          </div>
          <div className="ticker-item">
            <span className="dot" />
            Mess Bill Due: 15th of Every Month
          </div>
          <div className="ticker-item">
            <span className="dot" />
            Annual Sports Day: March 28, 2025
          </div>
          <div className="ticker-item">
            <span className="dot" />
            Visitor Hours: 4 PM – 7 PM Daily
          </div>
          <div className="ticker-item">
            <span className="dot" />
            Maintenance Requests via Portal Only
          </div>
          <div className="ticker-item">
            <span className="dot" />
            New Admission Open for 2025–26
          </div>
          <div className="ticker-item">
            <span className="dot" />
            Mess Bill Due: 15th of Every Month
          </div>
          <div className="ticker-item">
            <span className="dot" />
            Annual Sports Day: March 28, 2025
          </div>
          <div className="ticker-item">
            <span className="dot" />
            Visitor Hours: 4 PM – 7 PM Daily
          </div>
          <div className="ticker-item">
            <span className="dot" />
            Maintenance Requests via Portal Only
          </div>
        </div>
      </div>

      {/* About */}
      <section className="about" id="about">
        <div className="section-header reveal">
          <div className="section-eyebrow">About the Hostel</div>
          <h2 className="section-title">
            A Legacy of <em>Excellence</em>
            <br />& Brotherhood
          </h2>
        </div>
        <div className="about-grid">
          <div className="about-visual reveal">
            <div className="about-img-frame">
              <div className="placeholder-scene">
                <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
                  <circle cx="90" cy="90" r="80" stroke="rgba(200,151,58,0.15)" strokeWidth="1" />
                  <circle cx="90" cy="90" r="60" stroke="rgba(200,151,58,0.1)" strokeWidth="1" />
                  <circle cx="90" cy="90" r="40" stroke="rgba(200,151,58,0.1)" strokeWidth="1" />
                  <path d="M90 40 L90 140 M40 90 L140 90" stroke="rgba(200,151,58,0.1)" strokeWidth="1" />
                  <path d="M40 40 L140 140 M140 40 L40 140" stroke="rgba(200,151,58,0.06)" strokeWidth="1" />
                  <rect
                    x="55"
                    y="70"
                    width="70"
                    height="60"
                    fill="rgba(200,151,58,0.12)"
                    stroke="rgba(200,151,58,0.4)"
                    strokeWidth="1"
                  />
                  <polygon
                    points="55,70 90,45 125,70"
                    fill="rgba(200,151,58,0.08)"
                    stroke="rgba(200,151,58,0.4)"
                    strokeWidth="1"
                  />
                  <rect
                    x="75"
                    y="100"
                    width="30"
                    height="30"
                    fill="rgba(200,151,58,0.2)"
                    stroke="rgba(200,151,58,0.5)"
                    strokeWidth="0.5"
                  />
                  <rect
                    x="60"
                    y="80"
                    width="15"
                    height="12"
                    fill="rgba(200,151,58,0.3)"
                    stroke="rgba(200,151,58,0.4)"
                    strokeWidth="0.5"
                  />
                  <rect
                    x="105"
                    y="80"
                    width="15"
                    height="12"
                    fill="rgba(200,151,58,0.3)"
                    stroke="rgba(200,151,58,0.4)"
                    strokeWidth="0.5"
                  />
                  <circle cx="25" cy="25" r="2" fill="rgba(200,151,58,0.6)" />
                  <circle cx="155" cy="25" r="2" fill="rgba(200,151,58,0.6)" />
                  <circle cx="25" cy="155" r="2" fill="rgba(200,151,58,0.6)" />
                  <circle cx="155" cy="155" r="2" fill="rgba(200,151,58,0.6)" />
                  <text
                    x="90"
                    y="158"
                    textAnchor="middle"
                    fontSize="8"
                    fill="rgba(200,151,58,0.6)"
                    fontFamily="monospace"
                    letterSpacing="3"
                  >
                    DEI · 1981
                  </text>
                </svg>
              </div>
            </div>
            <div className="about-float-badge">
              <span className="big">40+</span>
              <span className="small">
                Years of
                <br />
                Excellence
              </span>
            </div>
          </div>

          <div className="about-content reveal" style={{ transitionDelay: "0.2s" }}>
            <div className="section-eyebrow">Our Story</div>
            <h2 className="section-title" style={{ fontSize: "2.8rem" }}>
              Home Away
              <br />
              From <em>Home</em>
            </h2>
            <p className="about-body" style={{ marginTop: "1.5rem" }}>
              The Junior Boys Hostel at Dayalbagh Educational Institute has been the nurturing ground for generations of
              scholars since 1981. Nestled within the serene campus of DEI Agra, our hostel provides not just
              accommodation, but a complete ecosystem for academic growth, personal development, and lifelong
              friendships.
            </p>
            <p className="about-body">
              With dedicated wardens, modern amenities, and a community built on the founding values of Dayalbagh —
              simplicity, service, and satsang — we ensure every boarder feels safe, supported, and inspired.
            </p>
            <div className="about-features">
              <div className="about-feat">
                <i className="fas fa-shield-alt about-feat-icon" />
                <div>
                  <h5>24/7 Security</h5>
                  <p>Round-the-clock guards and CCTV coverage</p>
                </div>
              </div>
              <div className="about-feat">
                <i className="fas fa-utensils about-feat-icon" />
                <div>
                  <h5>Nutritious Mess</h5>
                  <p>Wholesome vegetarian meals, 3 times daily</p>
                </div>
              </div>
              <div className="about-feat">
                <i className="fas fa-book-open about-feat-icon" />
                <div>
                  <h5>Study Rooms</h5>
                  <p>Quiet spaces open late for serious study</p>
                </div>
              </div>
              <div className="about-feat">
                <i className="fas fa-heartbeat about-feat-icon" />
                <div>
                  <h5>Medical Support</h5>
                  <p>On-campus clinic with regular checkups</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Facilities */}
      <section className="facilities" id="facilities">
        <div className="section-header reveal">
          <div className="section-eyebrow">What We Offer</div>
          <h2 className="section-title">
            World-Class <em>Facilities</em>
            <br />
            for Every Need
          </h2>
        </div>
        <div className="facilities-grid">
          <div className="facility-card reveal" style={{ transitionDelay: "0.1s" }}>
            <div className="facility-thumb fac-1">
              <span className="fac-icon">🏠</span>
            </div>
            <div className="facility-body">
              <div className="facility-num">01 / 06</div>
              <div className="facility-name">Accommodation Rooms</div>
              <p className="facility-desc">
                Spacious double and triple sharing rooms with attached or common bathrooms. Furnished with beds, study
                tables, wardrobes, fans.
              </p>
              <span className="facility-tag">150 Seats Available</span>
            </div>
          </div>
          <div className="facility-card reveal" style={{ transitionDelay: "0.2s" }}>
            <div className="facility-thumb fac-2">
              <span className="fac-icon">🍽️</span>
            </div>
            <div className="facility-body">
              <div className="facility-num">02 / 06</div>
              <div className="facility-name">Mess & Dining Hall</div>
              <p className="facility-desc">
                Hygienic vegetarian mess serving breakfast, lunch, and dinner with a rotating weekly menu. Snacks
                available during evening hours.
              </p>
              <span className="facility-tag">200 Seating Capacity</span>
            </div>
          </div>
          <div className="facility-card reveal" style={{ transitionDelay: "0.2s" }}>
            <div className="facility-thumb fac-3">
              <span className="fac-icon">📚</span>
            </div>
            <div className="facility-body">
              <div className="facility-num">03 / 06</div>
              <div className="facility-name">Reading Room & Library</div>
              <p className="facility-desc">
                Dedicated reading hall with individual study carrels, open till midnight. Reference books and periodicals
                available for boarders.
              </p>
              <span className="facility-tag">Open 5 AM – 12 AM</span>
            </div>
          </div>
          <div className="facility-card reveal" style={{ transitionDelay: "0.3s" }}>
            <div className="facility-thumb fac-4">
              <span className="fac-icon">🏏</span>
            </div>
            <div className="facility-body">
              <div className="facility-num">04 / 06</div>
              <div className="facility-name">Sports & Recreation</div>
              <p className="facility-desc">
                Cricket ground, volleyball and badminton courts, carrom room, and indoor games lounge. Annual sports
                tournament for all boarders.
              </p>
              <span className="facility-tag">Multiple Sports</span>
            </div>
          </div>
          <div className="facility-card reveal" style={{ transitionDelay: "0.4s" }}>
            <div className="facility-thumb fac-5">
              <span className="fac-icon">📶</span>
            </div>
            <div className="facility-body">
              <div className="facility-num">05 / 06</div>
              <div className="facility-name">Internet & Computing</div>
              <p className="facility-desc">
                High-speed campus Wi-Fi available 24/7. Computer lab with broadband access and printing facility
                available on request.
              </p>
              <span className="facility-tag">100 Mbps Fiber</span>
            </div>
          </div>
          <div className="facility-card reveal" style={{ transitionDelay: "0.5s" }}>
            <div className="facility-thumb fac-6">
              <span className="fac-icon">🏥</span>
            </div>
            <div className="facility-body">
              <div className="facility-num">06 / 06</div>
              <div className="facility-name">Medical & Wellness</div>
              <p className="facility-desc">
                On-campus dispensary with resident medical officer. Ambulance available for emergencies. Monthly health
                checkups organized for all residents.
              </p>
              <span className="facility-tag">24/7 First Aid</span>
            </div>
          </div>
        </div>
      </section>

      {/* Notices */}
      <section className="notices" id="notices">
        <div className="section-header reveal">
          <div className="section-eyebrow">Latest Updates</div>
          <h2 className="section-title">
            Notices &<br />
            <em>Announcements</em>
          </h2>
        </div>
        <div className="notices-layout">
          <div className="notice-list reveal">
            <div className="notice-item">
              <span className="notice-date">14 Mar</span>
              <div className="notice-content">
                <h4>Mess Bill Payment Deadline Extended</h4>
                <p>Due to technical issues, the payment deadline has been extended to 20th March 2025.</p>
              </div>
              <span className="notice-badge badge-urgent">Urgent</span>
            </div>
            <div className="notice-item">
              <span className="notice-date">12 Mar</span>
              <div className="notice-content">
                <h4>Annual Sports Day Registration Open</h4>
                <p>All boarders are invited to register for Annual Sports Day events by 20th March.</p>
              </div>
              <span className="notice-badge badge-info">Sports</span>
            </div>
            <div className="notice-item">
              <span className="notice-date">10 Mar</span>
              <div className="notice-content">
                <h4>Water Supply Interruption – Block C</h4>
                <p>Water supply in Block C will be interrupted from 8 AM to 12 PM on 16th March for pipeline maintenance.</p>
              </div>
              <span className="notice-badge badge-urgent">Alert</span>
            </div>
            <div className="notice-item">
              <span className="notice-date">08 Mar</span>
              <div className="notice-content">
                <h4>New Mess Menu for April</h4>
                <p>Revised mess menu for April 2025 has been uploaded to the student portal. Feedback welcome.</p>
              </div>
              <span className="notice-badge badge-general">Mess</span>
            </div>
            <div className="notice-item">
              <span className="notice-date">05 Mar</span>
              <div className="notice-content">
                <h4>Wi-Fi Upgrade Completed</h4>
                <p>Campus-wide Wi-Fi has been upgraded to 100 Mbps fiber. New passwords posted on notice boards.</p>
              </div>
              <span className="notice-badge badge-info">Tech</span>
            </div>
            <div className="notice-item">
              <span className="notice-date">01 Mar</span>
              <div className="notice-content">
                <h4>Room Allocation for New Boarders</h4>
                <p>New boarders for March intake are requested to collect their room keys from the Warden's office.</p>
              </div>
              <span className="notice-badge badge-general">Admin</span>
            </div>
          </div>
          <div className="notice-sidebar reveal" style={{ transitionDelay: "0.2s" }}>
            <h3>Upcoming Events</h3>
            <p>Mark your calendar for these important dates and events at Junior Boys Hostel.</p>
            <div className="upcoming-event">
              <div className="event-date-box">
                <div className="event-day">
                  <span className="num">28</span>
                  <span className="month">Mar</span>
                </div>
                <div className="event-info">
                  <h4>Annual Sports Day</h4>
                  <p>Ground A · 8:00 AM Onwards</p>
                </div>
              </div>
              <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                Participate in cricket, volleyball, badminton, and track events. Prizes for top performers. All boarders
                encouraged to participate.
              </p>
            </div>
            <div className="upcoming-event" style={{ marginTop: 16 }}>
              <div className="event-date-box">
                <div className="event-day" style={{ background: "var(--teal-light)" }}>
                  <span className="num">05</span>
                  <span className="month">Apr</span>
                </div>
                <div className="event-info">
                  <h4>Cultural Night</h4>
                  <p>Main Hall · 6:00 PM Onwards</p>
                </div>
              </div>
              <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                Annual cultural evening featuring music, drama, and literary performances by hostel boarders. Open to all
                students and faculty.
              </p>
            </div>
            <Link
              to="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginTop: 24,
                color: "var(--gold)",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "0.72rem",
                letterSpacing: "1px",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              View All Notices (Login) <i className="fas fa-arrow-right" />
            </Link>
          </div>
        </div>
      </section>

      {/* Seats */}
      <section className="seats" id="seats">
        <div className="section-header reveal">
          <div className="section-eyebrow">Availability</div>
          <h2 className="section-title">
            Current <em>Seat</em>
            <br />
            Availability
          </h2>
        </div>
        <p className="reveal" style={{ color: "var(--muted)", maxWidth: 580, lineHeight: 1.7, marginTop: -30, marginBottom: 10 }}>
          Real-time status of available seats across all room categories. Contact the warden's office for admission inquiries.
        </p>
        <div className="seats-grid">
          <div className="seat-card seat-w1 reveal">
            <div className="seat-card-head">
              <span className="seat-type">Double Sharing</span>
              <span className="seat-status-dot dot-available" />
            </div>
            <div className="seat-card-body">
              <div className="seat-num" style={{ color: "var(--teal)" }}>18</div>
              <div className="seat-label">Seats Available / 80 Total</div>
              <div className="seat-bar"><div className="seat-bar-fill fill-green" data-width="77" /></div>
            </div>
          </div>
          <div className="seat-card seat-w2 reveal" style={{ transitionDelay: "0.1s" }}>
            <div className="seat-card-head">
              <span className="seat-type">Triple Sharing</span>
              <span className="seat-status-dot dot-limited" />
            </div>
            <div className="seat-card-body">
              <div className="seat-num" style={{ color: "var(--gold)" }}>06</div>
              <div className="seat-label">Seats Available / 120 Total</div>
              <div className="seat-bar"><div className="seat-bar-fill fill-yellow" data-width="95" /></div>
            </div>
          </div>
          <div className="seat-card seat-w3 reveal" style={{ transitionDelay: "0.2s" }}>
            <div className="seat-card-head">
              <span className="seat-type">Single Room</span>
              <span className="seat-status-dot dot-full" />
            </div>
            <div className="seat-card-body">
              <div className="seat-num" style={{ color: "var(--rust)" }}>00</div>
              <div className="seat-label">Seats Available / 20 Total</div>
              <div className="seat-bar"><div className="seat-bar-fill fill-red" data-width="100" /></div>
            </div>
          </div>
          <div className="seat-card seat-w4 reveal" style={{ transitionDelay: "0.3s" }}>
            <div className="seat-card-head">
              <span className="seat-type">Reserved Category</span>
              <span className="seat-status-dot dot-available" />
            </div>
            <div className="seat-card-body">
              <div className="seat-num" style={{ color: "var(--teal)" }}>04</div>
              <div className="seat-label">Seats Available / 20 Total</div>
              <div className="seat-bar"><div className="seat-bar-fill fill-green" data-width="80" /></div>
            </div>
          </div>
        </div>
        <div className="reveal" style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Link to="/login" className="btn-primary"><i className="fas fa-file-alt" /> Apply for Admission</Link>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
            Last updated: Today · <a href="#contact" style={{ color: "var(--teal)", textDecoration: "none" }}>Contact Warden →</a>
          </p>
        </div>
      </section>

      {/* Gallery */}
      <section className="gallery" id="gallery">
        <div className="section-header reveal">
          <div className="section-eyebrow">Life at JBH</div>
          <h2 className="section-title">Campus <em>Gallery</em></h2>
        </div>
        <div className="gallery-masonry">
          {[
            { cls: "g1", icon: "fa-home", label: "Hostel Building" },
            { cls: "g2", icon: "fa-utensils", label: "Dining Hall" },
            { cls: "g3", icon: "fa-book", label: "Reading Room" },
            { cls: "g4", icon: "fa-trophy", label: "Sports Ground" },
            { cls: "g5", icon: "fa-bed", label: "Student Room" },
            { cls: "g6", icon: "fa-users", label: "Common Area" },
          ].map((g, idx) => (
            <div key={g.cls} className="gallery-item reveal" style={idx ? { transitionDelay: `${idx * 0.1}s` } : undefined}>
              <div className={`gallery-placeholder ${g.cls}`}>
                <i className={`fas ${g.icon}`} />
                <span>{g.label}</span>
              </div>
              <div className="gallery-item-overlay"><span><i className="fas fa-expand" /> View</span></div>
            </div>
          ))}
        </div>
        <div className="reveal" style={{ textAlign: "center", marginTop: 40 }}>
          <a href="#" className="btn-secondary"><i className="fas fa-images" /> View Full Gallery</a>
        </div>
      </section>

      {/* Rules */}
      <section className="rules" id="rules">
        <div className="section-header reveal">
          <div className="section-eyebrow">Hostel Conduct</div>
          <h2 className="section-title">Rules &<br /><em>Regulations</em></h2>
        </div>
        <div className="rules-layout">
          <div className="rules-list reveal">
            {[
              ["Gate Timings & Curfew", "All boarders must return to the hostel by 9:00 PM on weekdays and 10:00 PM on weekends. The main gate will be closed thereafter. Late entries require prior written permission from the Warden."],
              ["Mess Rules & Meal Timings", "Breakfast: 7–9 AM · Lunch: 12–2 PM · Dinner: 7–9 PM. Boarders must eat in the mess hall only. Outside food is not permitted inside the dining area. Mess cards are mandatory."],
              ["Visitor Policy", "Visitors are allowed only in the common visitor room during designated hours (4 PM – 7 PM). No visitors are permitted inside dormitory blocks under any circumstances."],
              ["Noise & Disturbance", "Silence hours are from 10 PM to 6 AM. Use of loud music, TV, or disturbing the peace of fellow boarders is strictly prohibited during these hours."],
              ["Room Maintenance & Cleanliness", "Each boarder is responsible for maintaining their room in a clean and tidy condition. Periodic inspections will be conducted by the Warden's office."],
              ["Leave & Absence Procedure", "Prior written leave application must be submitted to the Warden at least 24 hours before departure. Emergency leaves must be communicated immediately."],
            ].map(([t, d], idx) => (
              <div key={t} className="rule-item">
                <div className="rule-num">{String(idx + 1).padStart(2, "0")}</div>
                <div className="rule-content"><h4>{t}</h4><p>{d}</p></div>
              </div>
            ))}
          </div>
          <div className="rules-sidebar reveal" style={{ transitionDelay: "0.2s" }}>
            <div className="rules-download">
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>📋</div>
              <h3>Full Rulebook</h3>
              <p>Download the complete hostel rules and regulations handbook. All boarders are advised to read and follow all guidelines strictly.</p>
              <a href="#" className="btn-download"><i className="fas fa-download" /> Download PDF</a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="contact" id="contact">
        <div className="section-header reveal">
          <div className="section-eyebrow">Get in Touch</div>
          <h2 className="section-title">
            Contact &<br />
            <em>Location</em>
          </h2>
        </div>
        <div className="contact-grid">
          <div className="contact-info reveal">
            <div className="contact-item">
              <div className="contact-icon">
                <i className="fas fa-map-marker-alt" />
              </div>
              <div className="contact-detail">
                <h5>Address</h5>
                <p>
                  Junior Boys Hostel, Dayalbagh Educational Institute
                  <br />
                  Dayalbagh, Agra – 282 005, Uttar Pradesh, India
                </p>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-icon">
                <i className="fas fa-phone-alt" />
              </div>
              <div className="contact-detail">
                <h5>Phone</h5>
                <p>Warden Office: +91-562-XXX-XXXX</p>
                <p>Reception: +91-562-XXX-XXXX</p>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-icon">
                <i className="fas fa-envelope" />
              </div>
              <div className="contact-detail">
                <h5>Email</h5>
                <a href="mailto:jbh@dei.ac.in">jbh@dei.ac.in</a>
                <br />
                <a href="mailto:warden.jbh@dei.ac.in">warden.jbh@dei.ac.in</a>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-icon">
                <i className="fas fa-clock" />
              </div>
              <div className="contact-detail">
                <h5>Office Hours</h5>
                <p>Mon – Sat: 9:00 AM – 5:00 PM</p>
                <p>Sunday: 10:00 AM – 1:00 PM</p>
              </div>
            </div>
          </div>

          <div className="contact-form reveal" style={{ transitionDelay: "0.2s" }}>
            <h3>Send a Message</h3>
            <form id="contactForm" onSubmit={onContactSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Your Name</label>
                  <input type="text" name="name" placeholder="Full name" required />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="tel" name="phone" placeholder="+91 XXXXX XXXXX" />
                </div>
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" name="email" placeholder="your@email.com" required />
              </div>
              <div className="form-group">
                <label>Query Type</label>
                <select name="query_type">
                  <option value="">Select a category</option>
                  <option value="Admission Inquiry">Admission Inquiry</option>
                  <option value="Facilities Information">Facilities Information</option>
                  <option value="Mess / Billing">Mess / Billing</option>
                  <option value="Complaint / Grievance">Complaint / Grievance</option>
                  <option value="Parent / Guardian Inquiry">Parent / Guardian Inquiry</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea name="message" placeholder="Describe your query or concern in detail..." required />
              </div>
              <button
                type="submit"
                className="btn-submit"
                id="contactSubmitBtn"
                disabled={contactState === "sending"}
                style={contactState === "sent" ? { background: "#22c55e", color: "white" } : undefined}
              >
                {contactState === "sending" ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-paper-plane" />}{" "}
                {contactBtnText}
              </button>
            </form>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="nav-logo-badge" style={{ width: 46, height: 46, fontSize: 18 }}>
              JBH
            </div>
            <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "1.4rem", color: "white", marginTop: 8 }}>
              Junior Boys Hostel
            </h3>
            <p
              style={{
                fontSize: "0.82rem",
                color: "rgba(255,255,255,0.4)",
                lineHeight: 1.7,
                maxWidth: 280,
                marginTop: 12,
              }}
            >
              A place of learning, brotherhood, and growth. Part of the legacy of Dayalbagh Educational Institute, Agra since 1981.
            </p>
            <p
              style={{
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: "0.62rem",
                letterSpacing: 2,
                color: "rgba(255,255,255,0.25)",
                marginTop: 20,
              }}
            >
              NAAC ACCREDITED · UGC RECOGNIZED · ESTABLISHED 1981
            </p>
          </div>
          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li>
                <a href="#home">Home</a>
              </li>
              <li>
                <a href="#about">About Hostel</a>
              </li>
              <li>
                <a href="#facilities">Facilities</a>
              </li>
              <li>
                <a href="#seats">Seat Availability</a>
              </li>
              <li>
                <a href="#gallery">Photo Gallery</a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Information</h4>
            <ul>
              <li>
                <a href="#notices">Notices</a>
              </li>
              <li>
                <a href="#rules">Rules & Regulations</a>
              </li>
              <li>
                <Link to="/login">Student Login</Link>
              </li>
              <li>
                <a href="#">Mess Menu</a>
              </li>
              <li>
                <a href="#">DEI Main Website</a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <ul>
              <li>
                <a href="tel:+91562XXXXXX">
                  <i className="fas fa-phone" style={{ width: 12 }} /> +91-562-XXX-XXXX
                </a>
              </li>
              <li>
                <a href="mailto:jbh@dei.ac.in">
                  <i className="fas fa-envelope" style={{ width: 12 }} /> jbh@dei.ac.in
                </a>
              </li>
              <li>
                <a href="#contact">
                  <i className="fas fa-map-marker-alt" style={{ width: 12 }} /> Dayalbagh, Agra
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2025 Junior Boys Hostel · DEI Agra · Designed for Academic Excellence</p>
          <div className="footer-social">
            <a href="#">
              <i className="fab fa-facebook-f" />
            </a>
            <a href="#">
              <i className="fab fa-instagram" />
            </a>
            <a href="#">
              <i className="fab fa-twitter" />
            </a>
            <a href="#">
              <i className="fab fa-youtube" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;

