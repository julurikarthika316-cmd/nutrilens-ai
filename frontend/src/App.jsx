import React from "react";

import { useEffect, useRef, useState } from "react";

import {

  Leaf, ScanLine, ShieldCheck, HeartPulse, ArrowRight, ArrowLeft,

  UploadCloud, Camera, UserRound, LogOut, Volume2, CheckCircle2,

  AlertTriangle, Info, Flame, Droplets, Dumbbell, Sparkles, Clock3,

  ChevronRight, LoaderCircle, Activity, Apple, FileText, X, RefreshCw

} from "lucide-react";

import { api } from "./api";



const CONDITIONS = [

  "Diabetes", "High blood pressure", "Obesity / weight management",

  "Heart disease", "Kidney disease", "High cholesterol"

];



const DIETS = [

  "Vegetarian", "Vegan", "Gluten-free", "Low sodium", "Lactose-free"

];



const EMPTY_PROFILE = {

  name: "",

  age: "",

  height_cm: "",

  weight_kg: "",

  conditions: [],

  allergies: [],

  dietary_preferences: [],

  sugar_daily_reference_g: 50

};



function prettyKey(key) {

  return ({

    calories_kcal: "Energy",

    energy_kcal: "Energy",

    protein_g: "Protein",

    total_carbohydrates_g: "Total carbohydrates",

    carbohydrates_g: "Carbohydrates",

    total_sugar_g: "Total sugar",

    added_sugar_g: "Added sugar",

    total_fat_g: "Total fat",

    saturated_fat_g: "Saturated fat",

    trans_fat_g: "Trans fat",

    fiber_g: "Dietary fibre",

    fibre_g: "Dietary fibre",

    sodium_mg: "Sodium",

    cholesterol_mg: "Cholesterol",

    potassium_mg: "Potassium",

    calcium_mg: "Calcium",

    iron_mg: "Iron",

    vitamin_d_mcg: "Vitamin D",

    serving_size_g: "Serving size"

  })[key] || key.replaceAll("_", " ");

}



function nutrientUnit(key) {

  if (key.includes("calories") || key.includes("energy")) return "kcal";

  if (key.includes("_mcg")) return "mcg";

  if (key.includes("_mg")) return "mg";

  if (key.includes("_g")) return "g";

  return "";

}



function valueText(key, value) {

  return `${Number(value).toLocaleString(undefined, {

    maximumFractionDigits: 1

  })} ${nutrientUnit(key)}`.trim();

}



function formatDate(value) {

  try {

    return new Date(value).toLocaleString([], {

      dateStyle: "medium",

      timeStyle: "short"

    });

  } catch {

    return value;

  }

}



export default function App() {

  const [screen, setScreen] = useState("home");

  const [authMode, setAuthMode] = useState("register");

  const [auth, setAuth] = useState({

    name: "",

    email: "",

    password: ""

  });

  const [profile, setProfile] = useState(EMPTY_PROFILE);

  const [user, setUser] = useState(null);

  const [file, setFile] = useState(null);

  const [preview, setPreview] = useState("");

  const [scan, setScan] = useState(null);

  const [history, setHistory] = useState([]);

  const [daily, setDaily] = useState(null);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const fileInput = useRef(null);



  useEffect(() => {

    const token = localStorage.getItem("nutrilens_token");

    if (!token) return;



    api.me()

      .then((u) => {

        setUser(u);

        setProfile({

          ...EMPTY_PROFILE,

          ...u,

          age: u.age ?? "",

          height_cm: u.height_cm ?? "",

          weight_kg: u.weight_kg ?? ""

        });

        setScreen("dashboard");

        refreshData();

      })

      .catch(() => localStorage.removeItem("nutrilens_token"));

  }, []);



  async function refreshData() {

    try {

      const [s, d] = await Promise.all([

        api.scans(),

        api.dailySummary()

      ]);

      setHistory(s);

      setDaily(d);

    } catch {

      // Dashboard remains usable if history cannot load.

    }

  }



  function changeProfile(key, value) {

    setProfile((p) => ({ ...p, [key]: value }));

  }



  function toggleArray(key, value) {

    setProfile((p) => ({

      ...p,

      [key]: p[key].includes(value)

        ? p[key].filter((x) => x !== value)

        : [...p[key], value]

    }));

  }



  function goAuth(mode = "register") {

    setAuthMode(mode);

    setError("");

    setNotice("");

    setScreen("auth");

  }



  async function submitAuth(e) {

    e.preventDefault();

    setBusy(true);

    setError("");



    try {

      const data = authMode === "register"

        ? await api.register({

            name: auth.name,

            email: auth.email,

            password: auth.password

          })

        : await api.login({

            email: auth.email,

            password: auth.password

          });



      localStorage.setItem("nutrilens_token", data.access_token);

      setUser(data.user);

      setProfile({

        ...EMPTY_PROFILE,

        ...data.user,

        age: data.user.age ?? "",

        height_cm: data.user.height_cm ?? "",

        weight_kg: data.user.weight_kg ?? ""

      });

      setScreen("profile");

      setNotice(

        authMode === "register"

          ? "Account created. Complete your health profile."

          : "Welcome back."

      );

    } catch (err) {

      setError(err.message);

    } finally {

      setBusy(false);

    }

  }



  async function saveProfile(e) {

    e.preventDefault();

    setBusy(true);

    setError("");

    setNotice("");



    const payload = {

      ...profile,

      age: profile.age === "" ? null : Number(profile.age),

      height_cm: profile.height_cm === "" ? null : Number(profile.height_cm),

      weight_kg: profile.weight_kg === "" ? null : Number(profile.weight_kg),

      sugar_daily_reference_g: Number(profile.sugar_daily_reference_g || 50)

    };



    try {

      const updated = await api.saveProfile(payload);

      setUser(updated);

      setProfile({

        ...EMPTY_PROFILE,

        ...updated,

        age: updated.age ?? "",

        height_cm: updated.height_cm ?? "",

        weight_kg: updated.weight_kg ?? ""

      });

      setNotice("Your health profile has been saved.");

      setScreen("dashboard");

      await refreshData();

    } catch (err) {

      setError(err.message);

    } finally {

      setBusy(false);

    }

  }



  function chooseFile(next) {

    if (!next) return;



    if (!next.type.startsWith("image/")) {

      setError("Please choose an image file.");

      return;

    }



    if (next.size > 8 * 1024 * 1024) {

      setError("Image must be 8 MB or smaller.");

      return;

    }



    setFile(next);

    setPreview(URL.createObjectURL(next));

    setScan(null);

    setError("");

    setNotice("");

  }



  async function runScan(e) {

    e?.preventDefault();



    if (!file) {

      setError("Choose a clear photo of the ingredients and nutrition label first.");

      return;

    }



    setBusy(true);

    setError("");

    setNotice("");



    try {

      const result = await api.scan(file);

      setScan(result);

      setScreen("results");

      await refreshData();

    } catch (err) {

      setError(err.message || "The scan failed. Please try again.");

    } finally {

      setBusy(false);

    }

  }



    function logout() {

    localStorage.removeItem("nutrilens_token");

    setUser(null);

    setScan(null);

    setFile(null);

    setPreview("");

    setHistory([]);

    setDaily(null);

    setScreen("home");

    setNotice("");

    setError("");

  }



  function speakReport() {

    if (!scan || !("speechSynthesis" in window)) {

      setError("Text-to-speech is not available in this browser.");

      return;

    }



    window.speechSynthesis.cancel();



    const nutrients = Object.entries(scan.nutrition || {})

      .map(([k, v]) => `${prettyKey(k)}: ${valueText(k, v)}.`)

      .join(" ");



    const message = `${scan.product_name}. Food label analysis. ${nutrients}. ${(scan.warnings || []).join(" ")}`;

    const utterance = new SpeechSynthesisUtterance(message);

    utterance.rate = 0.88;

    window.speechSynthesis.speak(utterance);

  }



  const sugarPct = daily ? Math.min(100, daily.sugar_percent) : 0;



  return (

    <div className="app-shell">

      <header className="topbar">

        <button

          className="brand"

          onClick={() => setScreen(user ? "dashboard" : "home")}

          aria-label="NutriLens home"

        >

          <span className="brand-mark"><Leaf size={22} /></span>

          <span>

            <strong>NutriLens<span> AI</span></strong>

            <small>LOOK BEYOND THE LABEL</small>

          </span>

        </button>



        <nav className="top-nav">

          {user ? (

            <>

              <button

                className={screen === "dashboard" ? "nav-link active" : "nav-link"}

                onClick={() => setScreen("dashboard")}

              >

                Dashboard

              </button>

              <button

                className={screen === "profile" ? "nav-link active" : "nav-link"}

                onClick={() => setScreen("profile")}

              >

                Health profile

              </button>

              <button className="nav-user" onClick={logout}>

                <LogOut size={16} /><span>Log out</span>

              </button>

            </>

          ) : (

            <>

              <button className="nav-link" onClick={() => goAuth("login")}>

                Log in

              </button>

              <button

                className="button button-dark button-small"

                onClick={() => goAuth("register")}

              >

                Get started <ArrowRight size={15} />

              </button>

            </>

          )}

        </nav>

      </header>



      {error && (

        <div className="toast toast-error" role="alert">

          <AlertTriangle size={17} />

          {error}

          <button onClick={() => setError("")} aria-label="Dismiss error">

            <X size={16} />

          </button>

        </div>

      )}



      {notice && (

        <div className="toast toast-success" role="status">

          <CheckCircle2 size={17} />

          {notice}

          <button onClick={() => setNotice("")} aria-label="Dismiss notice">

            <X size={16} />

          </button>

        </div>

      )}



      {screen === "home" && (

        <main>

          <section className="hero">

            <div className="hero-copy">

              <div className="eyebrow">

                <span className="eyebrow-dot"></span>

                YOUR FOOD. UNDERSTOOD.

              </div>

              <h1>Know what’s<br /><em>inside</em> your food.</h1>

              <p className="hero-description">

                A little label can hide a lot of information. Scan packaged food

                to understand its ingredients, nutrition and how it fits your

                personal health goals.

              </p>

              <div className="hero-actions">

                <button

                  className="button button-dark"

                  onClick={() => goAuth("register")}

                >

                  Start scanning <ArrowRight size={17} />

                </button>

                <button

                  className="button button-light"

                  onClick={() =>

                    document.getElementById("how-it-works")?.scrollIntoView({

                      behavior: "smooth"

                    })

                  }

                >

                  How it works

                </button>

              </div>

              <div className="trust-line">

                <ShieldCheck size={17} />

                <span>Personalized insights. Clearer choices.</span>

              </div>

            </div>



            <div className="hero-visual">

              <div className="orbit orbit-one"></div>

              <div className="orbit orbit-two"></div>

              <div className="food-card">

                <div className="food-card-top">

                  <span className="mini-tag"><Sparkles size={12} /> LABEL INSIGHT</span>

                  <span className="food-card-icon"><ScanLine size={19} /></span>

                </div>

                <div className="food-bowl">

                  <div className="bowl-leaf leaf-a"></div>

                  <div className="bowl-leaf leaf-b"></div>

                  <div className="bowl-leaf leaf-c"></div>

                  <div className="bowl-dot dot-a"></div>

                  <div className="bowl-dot dot-b"></div>

                  <div className="bowl-dot dot-c"></div>

                </div>

                <div className="food-card-title">

                  Every ingredient<br />has a story.

                </div>

                <div className="food-card-bottom">

                  <span><span className="status-dot"></span> Ready to decode</span>

                  <ArrowRight size={17} />

                </div>

              </div>



              <div className="floating-chip chip-sugar">

                <span className="chip-icon amber"><Droplets size={17} /></span>

                <span><small>SUGAR CONTENT</small><strong>Know your intake</strong></span>

              </div>

              <div className="floating-chip chip-health">

                <span className="chip-icon green"><HeartPulse size={18} /></span>

                <span><small>MADE FOR YOU</small><strong>Health-aware insights</strong></span>

              </div>

              <div className="hero-stamp">

                <Leaf size={18} />

                <span>Eat with<br />confidence</span>

              </div>

            </div>

          </section>



          <section className="feature-strip">

            <div>

              <span className="feature-icon"><ScanLine size={19} /></span>

              <span><strong>Scan & understand</strong><small>Turn label text into plain language.</small></span>

            </div>

            <div>

              <span className="feature-icon"><HeartPulse size={19} /></span>

              <span><strong>Personal to you</strong><small>See notes based on your health profile.</small></span>

            </div>

            <div>

              <span className="feature-icon"><Volume2 size={19} /></span>

              <span><strong>Listen, don’t squint</strong><small>Hear your results read aloud.</small></span>

            </div>

          </section>



          <section id="how-it-works" className="how-section">

            <div className="section-heading">

              <div className="eyebrow">A SIMPLER WAY TO READ FOOD</div>

              <h2>From confusing label<br />to <em>clear choice.</em></h2>

              <p>Three simple steps to make more informed food choices.</p>

            </div>

            <div className="steps-grid">

              <article className="step-card">

                <span className="step-number">01</span>

                <div className="step-icon"><UserRound size={22} /></div>

                <h3>Tell us about you</h3>

                <p>Add your health considerations, allergies and dietary preferences to personalize your report.</p>

              </article>

              <article className="step-card">

                <span className="step-number">02</span>

                <div className="step-icon"><ScanLine size={22} /></div>

                <h3>Scan the package</h3>

                <p>Upload a clear photo of the ingredients list and nutrition facts panel.</p>

              </article>

              <article className="step-card">

                <span className="step-number">03</span>

                <div className="step-icon"><Activity size={22} /></div>

                <h3>Understand the result</h3>

                <p>Review nutrition values, ingredient explanations and helpful health-aware reminders.</p>

              </article>

            </div>

          </section>

          <footer className="footer">

            <span className="footer-brand"><Leaf size={16} /> NutriLens AI</span>

            <span>Helping you look beyond the label.</span>

            <span>Informational tool, not medical advice.</span>

          </footer>

        </main>

      )}



      {screen === "auth" && (

        <main className="auth-layout">

          <div className="auth-side">

            <div className="auth-side-orb"><Leaf size={46} /></div>

            <div className="eyebrow">A HEALTHIER KIND OF CLARITY</div>

            <h1>Food labels,<br /><em>finally human.</em></h1>

            <p>Know the ingredients. Understand the numbers. Make choices that feel right for you.</p>

            <div className="auth-points">

              <span><CheckCircle2 size={17} /> Plain-language ingredient insights</span>

              <span><CheckCircle2 size={17} /> Your own health profile</span>

              <span><CheckCircle2 size={17} /> Voice-ready reports</span>

            </div>

          </div>



          <form className="panel auth-panel" onSubmit={submitAuth}>

            <button

              type="button"

              className="back-link"

              onClick={() => setScreen("home")}

            >

              <ArrowLeft size={15} /> Back to home

            </button>



            <div className="panel-heading">

              <span className="panel-kicker">

                {authMode === "register" ? "YOUR JOURNEY STARTS HERE" : "WELCOME BACK"}

              </span>

              <h2>{authMode === "register" ? "Create your account" : "Log in to NutriLens"}</h2>

              <p>{authMode === "register" ? "A few details to get you started." : "Pick up where you left off."}</p>

            </div>



            {authMode === "register" && (

              <label>

                Full name

                <input

                  required

                  value={auth.name}

                  onChange={(e) => setAuth({ ...auth, name: e.target.value })}

                  placeholder="e.g. Karthika Juluri"

                  autoComplete="name"

                />

              </label>

            )}



            <label>

              Email address

              <input

                required

                type="email"

                value={auth.email}

                onChange={(e) => setAuth({ ...auth, email: e.target.value })}

                placeholder="you@example.com"

                autoComplete="email"

              />

            </label>



            <label>

              Password

              <input

                required

                minLength={8}

                type="password"

                value={auth.password}

                onChange={(e) => setAuth({ ...auth, password: e.target.value })}

                placeholder="At least 8 characters"

                autoComplete={authMode === "register" ? "new-password" : "current-password"}

              />

            </label>



            <button className="button button-dark button-full" disabled={busy}>

              {busy ? <LoaderCircle className="spin" size={17} /> : null}

              {authMode === "register" ? "Create account" : "Log in"}

              <ArrowRight size={16} />

            </button>



            <div className="switch-auth">

              {authMode === "register" ? "Already have an account?" : "New to NutriLens?"}

              <button

                type="button"

                onClick={() => {

                  setAuthMode(authMode === "register" ? "login" : "register");

                  setError("");

                }}

              >

                {authMode === "register" ? "Log in" : "Create account"}

              </button>

            </div>

            <p className="form-footnote">

              <ShieldCheck size={14} /> Your health profile is private to your account.

            </p>

          </form>

        </main>

      )}



            {screen === "profile" && (

        <main className="workspace">

          <div className="workspace-header">

            <div>

              <div className="eyebrow">YOUR PERSONAL HEALTH PROFILE</div>

              <h1>Make insights <em>personal.</em></h1>

              <p>Help NutriLens tailor explanations to your needs. Fields can be updated any time.</p>

            </div>

            <div className="profile-avatar"><UserRound size={24} /></div>

          </div>



          <form className="panel profile-form" onSubmit={saveProfile}>

            <div className="form-section-title">

              <span className="step-icon"><UserRound size={19} /></span>

              <div><h3>About you</h3><p>Basic information for your profile.</p></div>

            </div>



            <div className="form-grid">

              <label>Full name

                <input required value={profile.name} onChange={(e) => changeProfile("name", e.target.value)} placeholder="Your name" />

              </label>

              <label>Age (years)

                <input type="number" min="1" max="120" value={profile.age} onChange={(e) => changeProfile("age", e.target.value)} placeholder="e.g. 45" />

              </label>

              <label>Height (cm)

                <input type="number" min="30" max="260" step="0.1" value={profile.height_cm} onChange={(e) => changeProfile("height_cm", e.target.value)} placeholder="e.g. 165" />

              </label>

              <label>Weight (kg)

                <input type="number" min="2" max="500" step="0.1" value={profile.weight_kg} onChange={(e) => changeProfile("weight_kg", e.target.value)} placeholder="e.g. 68" />

              </label>

            </div>



            <div className="form-section-title">

              <span className="step-icon"><HeartPulse size={19} /></span>

              <div><h3>Health considerations</h3><p>Select any that apply to you.</p></div>

            </div>

            <div className="choice-grid">

              {CONDITIONS.map((item) => (

                <label className="choice" key={item}>

                  <input type="checkbox" checked={profile.conditions.includes(item)} onChange={() => toggleArray("conditions", item)} />

                  <span>{item}</span>

                </label>

              ))}

            </div>



            <div className="form-section-title">

              <span className="step-icon"><Apple size={19} /></span>

              <div><h3>Dietary preferences</h3><p>Choose your dietary preferences.</p></div>

            </div>

            <div className="choice-grid">

              {DIETS.map((item) => (

                <label className="choice" key={item}>

                  <input type="checkbox" checked={profile.dietary_preferences.includes(item)} onChange={() => toggleArray("dietary_preferences", item)} />

                  <span>{item}</span>

                </label>

              ))}

            </div>



            <label>Food allergies

              <input

                value={Array.isArray(profile.allergies) ? profile.allergies.join(", ") : profile.allergies || ""}

                onChange={(e) => changeProfile("allergies", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))}

                placeholder="e.g. peanuts, milk, soy"

              />

              <small>Separate allergies with commas.</small>

            </label>



            <label>Daily added-sugar reference (g)

              <input type="number" min="1" max="300" value={profile.sugar_daily_reference_g} onChange={(e) => changeProfile("sugar_daily_reference_g", e.target.value)} />

            </label>



            <button className="button button-dark button-full" disabled={busy}>

              {busy ? <LoaderCircle className="spin" size={17} /> : null}

              Save health profile <ArrowRight size={16} />

            </button>

          </form>

        </main>

      )}



      {screen === "dashboard" && (

        <main className="workspace">

          <div className="workspace-header">

            <div>

              <div className="eyebrow">YOUR NUTRITION SPACE</div>

              <h1>Hello, <em>{user?.name?.split(" ")[0] || "there"}.</em></h1>

              <p>Scan a food label to understand what's inside and how it fits your preferences.</p>

            </div>

            <div className="profile-avatar"><Leaf size={24} /></div>

          </div>



          <div className="dashboard-grid">

            <section className="panel scan-panel">

              <div className="panel-heading">

                <span className="panel-kicker">FOOD LABEL SCANNER</span>

                <h2>What's in your food?</h2>

                <p>Upload a clear image of the nutrition facts panel and ingredients list.</p>

              </div>



              <form onSubmit={runScan}>

                <input

                  ref={fileInput}

                  type="file"

                  accept="image/\*"

                  capture="environment"

                  hidden

                  onChange={(e) => chooseFile(e.target.files?.[0])}

                />



                {preview ? (

                  <div className="image-preview">

                    <img src={preview} alt="Selected food label" />

                    <button type="button" className="remove-image" onClick={() => { setFile(null); setPreview(""); setScan(null); }}>

                      <X size={16} /> Remove image

                    </button>

                  </div>

                ) : (

                  <button type="button" className="upload-area" onClick={() => fileInput.current?.click()}>

                    <span className="upload-icon"><UploadCloud size={28} /></span>

                    <strong>Choose a label photo</strong>

                    <span>Click to upload or take a photo</span>

                    <small>Image files up to 8 MB</small>

                  </button>

                )}



                <div className="scan-actions">

                  <button type="button" className="button button-light" onClick={() => fileInput.current?.click()}>

                    <Camera size={17} /> {preview ? "Change photo" : "Choose photo"}

                  </button>

                  <button type="submit" className="button button-dark" disabled={busy || !file}>

                    {busy ? <LoaderCircle className="spin" size={17} /> : <ScanLine size={17} />}

                    {busy ? "Scanning..." : "Analyze label"}

                  </button>

                </div>

              </form>

              <p className="small-note">For better results, use good lighting and keep the text in focus.</p>

            </section>



            <section className="panel daily-panel">

              <div className="panel-heading">

                <span className="panel-kicker">DAILY OVERVIEW</span>

                <h2>Your sugar summary</h2>

                <p>Based on the scans recorded today.</p>

              </div>

              {daily ? (

                <>

                  <div className="sugar-summary">

                    <div className="sugar-number">

                      <strong>{Number(daily.sugar_g || 0).toFixed(1)}</strong><span>g scanned</span>

                    </div>

                    <div className="sugar-number">

                      <strong>{Number(daily.sugar_percent || 0).toFixed(0)}%</strong><span>of reference</span>

                    </div>

                  </div>

                  <div className="progress-track"><div className="progress-fill" style={{ width: `${sugarPct}%` }} /></div>

                  <p className="small-note">This summary reflects scanned products, not a complete record of everything you eat.</p>

                </>

              ) : (

                <div className="empty-state">

                  <span className="empty-icon"><Droplets size={23} /></span>

                  <strong>No scans recorded yet</strong>

                  <p>Your daily summary will appear after your first scan.</p>

                </div>

              )}

            </section>

          </div>



          <section className="panel history-panel">

            <div className="panel-heading">

              <span className="panel-kicker">YOUR ACTIVITY</span>

              <h2>Recent scans</h2>

            </div>

            {history.length ? (

              <div className="history-list">

                {history.map((item) => (

                  <button className="history-item" key={item.id} onClick={() => { setScan(item); setScreen("results"); }}>

                    <span className="history-icon"><FileText size={19} /></span>

                    <span className="history-info">

                      <strong>{item.product_name || "Scanned food label"}</strong>

                      <small>{item.created_at ? formatDate(item.created_at) : "Previous scan"}</small>

                    </span>

                    <ChevronRight size={18} />

                  </button>

                ))}

              </div>

            ) : (

              <div className="empty-state">

                <strong>Your scan history is empty</strong>

                <p>Your previous scans will be listed here.</p>

              </div>

            )}

          </section>

        </main>

      )}



      {screen === "results" && scan && (

        <main className="workspace">

          <button className="back-link" onClick={() => setScreen("dashboard")}>

            <ArrowLeft size={15} /> Back to dashboard

          </button>



          <div className="workspace-header">

            <div>

              <div className="eyebrow">YOUR LABEL REPORT</div>

              <h1>Food, <em>decoded.</em></h1>

              <p>Review the values detected from your food label.</p>

            </div>

            <button className="button button-light" onClick={speakReport}>

              <Volume2 size={17} /> Read report aloud

            </button>

          </div>



          <section className="panel results-panel">

            <div className="result-title">

              <span className="result-icon"><ScanLine size={24} /></span>

              <div>

                <span className="panel-kicker">SCANNED PRODUCT</span>

                <h2>{scan.product_name || "Food product"}</h2>

                {scan.created_at && <p>{formatDate(scan.created_at)}</p>}

              </div>

            </div>



            <div className="result-section">

              <h3><Activity size={18} /> Nutrition facts</h3>

              <p className="section-description">Values below are shown as returned by the scanner. Check the package for the serving size and units.</p>



              {(() => {

                const nutrition = scan.nutrition || {};

                const expectedNutrients = [

                  "calories_kcal",

                  "protein_g",

                  "total_carbohydrates_g",

                  "total_sugar_g",

                  "added_sugar_g",

                  "total_fat_g",

                  "saturated_fat_g",

                  "trans_fat_g",

                  "fiber_g",

                  "sodium_mg",

                  "cholesterol_mg",

                  "potassium_mg",

                  "calcium_mg",

                  "iron_mg",

                  "vitamin_d_mcg",

                  "serving_size_g"

                ];



                const keys = [...new Set([

                  ...expectedNutrients,

                  ...Object.keys(nutrition).filter((key) => key !== "serving_size_unit")

                ])];



                return (

                  <div className="nutrient-grid">

                    {keys.map((key) => {

                      const value = nutrition[key];

                      const detected = value !== undefined && value !== null && value !== "";

                      return (

                        <div className="nutrient-card" key={key}>

                          <span>{prettyKey(key)}</span>

                          <strong>{detected ? valueText(key, value) : "Not detected"}</strong>

                        </div>

                      );

                    })}

                  </div>

                );

              })()}



              <p className="small-note">

                “Not detected” means the scanner could not confidently read that value from this photo. Check the original package; no missing values are estimated.

              </p>

            </div>



<div className="result-section">
            <h3><Leaf size={18} /> Ingredients</h3>
            {(scan.ingredients || scan.ingredients_text) ? (
              <p className="ingredient-text">
                {scan.ingredients || scan.ingredients_text}
              </p>
            ) : (
              <p className="empty-message">
                Ingredients could not be confidently detected. Try uploading a sharper photo of the ingredients list.
              </p>
            )}
          </div>

          <div className="result-section">
            <h3><ShieldCheck size={18} /> Health insights</h3>

              {scan.warnings?.length ? (

                <div className="warning-list">

                  {scan.warnings.map((warning, index) => (

                    <div className="warning-item" key={`${index}-${warning}`}>

                      <AlertTriangle size={17} /><span>{warning}</span>

                    </div>

                  ))}

                </div>

              ) : (

                <div className="empty-message">No additional warnings were returned for this scan. This does not guarantee that the product is suitable for everyone.</div>

              )}

            </div>



            <div className="result-footer">

              <p><Info size={15} /> NutriLens AI provides informational guidance and is not a substitute for medical advice.</p>

              <button className="button button-dark" onClick={() => { setScan(null); setFile(null); setPreview(""); setScreen("dashboard"); }}>

                <RefreshCw size={16} /> Scan another product

              </button>

            </div>

          </section>

        </main>

      )}



      <footer className="footer app-footer">

        <span className="footer-brand"><Leaf size={16} /> NutriLens AI</span>

        <span>Helping you look beyond the label.</span>

        <span>Informational tool, not medical advice.</span>

      </footer>

    </div>

  );

}