import { useState, useEffect } from 'react'
import './App.css'
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import FileList from './components/FileList';
import HomePage from './components/HomePage';
import VideoPlayer from './components/VideoPlayer';
import MetadataEditor from './components/MetadataEditor';
import ServerConfig from './components/ServerConfig';
import './styles/global.css';
import './styles/layout.css';

function App() {
  const [serverConfig, setServerConfig] = useState({
    protocol: '',
    url: '',
    username: '',
    password: ''
  });
  
  // 从本地存储加载配置
  useEffect(() => {
    const savedConfig = localStorage.getItem('serverConfig');
    if (savedConfig) {
      try {
        setServerConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error('无法解析保存的配置:', e);
      }
    }
  }, []);

  // 保存配置到本地存储
  const saveConfig = (config: typeof serverConfig) => {
    setServerConfig(config);
    localStorage.setItem('serverConfig', JSON.stringify(config));
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <Link to="/" className="logo">Noediv</Link>
        <Link to="/config" className="config-btn">⚙️ 服务器配置</Link>
      </header>
      
      <div className="main-content">
        <aside className="sidebar">
          <nav className="side-nav">
            <Link to="/" className="nav-item">首页</Link>
            <Link to="/files" className="nav-item">文件浏览</Link>
            <Link to="/favorites" className="nav-item">收藏</Link>
          </nav>
        </aside>
        
        <main className="content-area">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/files" element={<FileList />} />
            <Route path="/config" element={<ServerConfig config={serverConfig} saveConfig={saveConfig} />} />
            <Route path="/metadata/:filename" element={<MetadataEditorWrapper />} />
            <Route path="/play/:filename" element={<PlayerWrapper />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

// 播放器包装组件
function PlayerWrapper() {
  const navigate = useNavigate();
  const pathParts = window.location.pathname.split('/');
  const filename = pathParts[pathParts.length - 1];
  
  if (!filename) {
    return <div>文件不存在</div>;
  }
  
  return (
    <div className="player-container">
      <VideoPlayer 
        src={`/api/raw/${filename}`}
        type={filename.endsWith('.mp3') ? 'audio' : 'video'}
      />
      <div className="media-info">
        <h2>{filename}</h2>
        <button onClick={() => navigate('/files')} className="back-link">返回列表</button>
      </div>
    </div>
  );
}

// 元数据编辑器包装组件
function MetadataEditorWrapper() {
  const navigate = useNavigate();
  const pathParts = window.location.pathname.split('/');
  const filename = pathParts[pathParts.length - 1];
  
  if (!filename) {
    return <div>文件不存在</div>;
  }
  
  return <MetadataEditor filename={filename} />;
}

export default App
