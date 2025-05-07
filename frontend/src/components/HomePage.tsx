import React from 'react';
import '../styles/global.css';

export const HomePage = () => {
  return (
    <div className="app-container">
      <header className="header">
        <img src="/images/indi-logo.svg" alt="INDI Logo" />
        <nav className="nav-links">
          <button className="upload-btn">Upload</button>
        </nav>
      </header>
      
      <main>
        {/* Hero Section */}
        <section className="hero-container">
          <div className="fallback-img">
            <img src="/images/mobile-logo.svg" alt="Movie Preview" />
          </div>
          <h1 className="title">SAM AWAY</h1>
          <p className="film-info">Adventure, Fantasy | 2019 | 136 Min.</p>
          <p className="film-credits">
            Director: Todd Burns<br />
            Cast: Jenny Loifer, Sarah Obrien, Larry Moss Jr.
          </p>
          <p className="film-about">
            When a tornado hits through City of Peaceville,
            Samantha (Jenny Loifer) and her dog, Ricko,
            are whisked away in their house to an amazing journey.
          </p>
          <button className="btn-watch">
            <img src="/images/play-icon.svg" alt="Play" />
            Watch Now
          </button>
        </section>

        {/* Recently Added Films */}
        <section className="container-films-1">
          <h2>Recently Added Films</h2>
          <div className="file-grid">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="file-card"></div>
            ))}
          </div>
        </section>

        {/* Top Rated Films */}
        <section className="container-films-1">
          <h2>Top Rated Films</h2>
          <div className="file-grid">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="file-card"></div>
            ))}
          </div>
        </section>

        {/* Promotion Section */}
        <section className="container-promotion">
          <div className="gif-cinema"></div>
          <div className="stay-connected">
            <h2>Stay Connected</h2>
            <p>
              From cult classics to modern masterpieces.
              Stay updated with the latest movies, news and articles
              from INDI.
            </p>
            <div className="email-input">
              <input type="email" placeholder="Your Email" />
              <button className="btn-submit">Submit</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HomePage;