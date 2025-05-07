import { useState } from 'react'
import './App.css'
import { Routes, Route, Link } from 'react-router-dom';
import FileList from './components/FileList';
import HomePage from './components/HomePage';
import VideoPlayer from './components/VideoPlayer';
import MetadataEditor from './components/MetadataEditor';
import './styles/global.css';
import './styles/layout.css';

function App() {
  const [serverConfig, setServerConfig] = useState({
    protocol: '',
    url: '',
    username: '',
    password: ''
  });

  return (
    <div className="app-container">
      <div className="cover-image">
        <img src="/images/cover-image.png" alt="Cover" />
      </div>
      
      <div className="main-content">
        <aside className="sidebar">
          <nav className="side-nav">
            <Link to="/" className="nav-item active">首页</Link>
            <Link to="/movies" className="nav-item">电影</Link>
            <Link to="/tv-shows" className="nav-item">电视剧</Link>
            <Link to="/favorites" className="nav-item">收藏</Link>
          </nav>
        </aside>
        
        <main className="content-area">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/metadata/:filename" element={<MetadataEditor />} />
            <Route path="/play/:filename" element={
              ({ match }) => (
                <div className="player-container">
                  <VideoPlayer 
                    src={`/static/files/${match.params.filename}`}
                    type={match.params.filename.endsWith('.mp3') ? 'audio' : 'video'}
                  />
                  <div className="media-info">
                    <h2>{match.params.filename}</h2>
                    <a href="/" className="back-link">返回列表</a>
                  </div>
                </div>
              )
            } />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App
