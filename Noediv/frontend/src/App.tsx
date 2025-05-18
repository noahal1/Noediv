import { useState, useEffect } from 'react'
import './App.css'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import FileList from './components/FileList';
import HomePage from './components/HomePage';
import ArtPlayer from './components/ArtPlayer';
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
  
  const location = useLocation();
  
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

  // 判断当前路径是否激活
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <Link to="/" className="logo">Noediv</Link>
          
          <nav className="header-nav">
            <Link to="/" className={`nav-item-horizontal ${isActive('/') ? 'active' : ''}`}>
              <span className="nav-icon">🏠</span>
              <span className="nav-text">首页</span>
            </Link>
            <Link to="/files" className={`nav-item-horizontal ${isActive('/files') ? 'active' : ''}`}>
              <span className="nav-icon">📁</span>
              <span className="nav-text">文件浏览</span>
            </Link>
            <Link to="/favorites" className={`nav-item-horizontal ${isActive('/favorites') ? 'active' : ''}`}>
              <span className="nav-icon">⭐</span>
              <span className="nav-text">收藏</span>
            </Link>
          </nav>
        </div>
        
        <Link to="/config" className="config-btn">⚙️ 服务器配置</Link>
      </header>
      
      <div className="main-content">
        <main className="content-area">
          <div className="content-wrapper">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/files" element={<FileList />} />
              <Route path="/config" element={<ServerConfig config={serverConfig} saveConfig={saveConfig} />} />
              <Route path="/metadata/:filename" element={<MetadataEditorWrapper />} />
              <Route path="/play/:filename" element={<PlayerWrapper />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

function MetadataEditorWrapper() {
  const navigate = useNavigate();
  const pathParts = window.location.pathname.split('/');
  const encodedFilename = pathParts[pathParts.length - 1];
  const filename = decodeURIComponent(encodedFilename);
  
  if (!filename) {
    return <div>文件不存在</div>;
  }
  
  return <MetadataEditor filename={filename} />;
}

function PlayerWrapper() {
  const navigate = useNavigate();
  const pathParts = window.location.pathname.split('/');
  const encodedFilename = pathParts[pathParts.length - 1];
  const filename = decodeURIComponent(encodedFilename);
  const [playerKey, setPlayerKey] = useState(0);
  
  if (!filename) {
    return <div>文件不存在</div>;
  }
  
  // 从URL参数中获取格式指定
  const urlParams = new URLSearchParams(window.location.search);
  const format = urlParams.get('format');
  
  // 根据参数选择不同的API源 - 使用已编码的文件名
  let sourceUrl = `/api/raw/${encodedFilename}`;
  if (format === 'mp4') {
    sourceUrl = `/api/converted/${encodedFilename}`;
  }
  
  const fileType = filename.endsWith('.mp3') || 
                 filename.endsWith('.flac') || 
                 filename.endsWith('.wav') || 
                 filename.endsWith('.aac') ||
                 filename.endsWith('.ogg') ||
                 filename.endsWith('.m4a') ? 'audio' : 'video';
  
  // 处理播放错误，可能是MKV格式需要转换为MP4
  const handlePlayerError = () => {
    console.error('播放器错误');
    
    // 如果是MKV格式错误，尝试切换到MP4
    if (filename.toLowerCase().endsWith('.mkv')) {
      console.log('尝试切换到MP4格式...');
      if (!format) {
        navigate(`/play/${encodedFilename}?format=mp4`);
      } else {
        setPlayerKey(prev => prev + 1);
      }
    }
  };
  
  return (
    <ArtPlayer 
      key={playerKey}
      src={sourceUrl}
      type={fileType}
      onError={handlePlayerError}
    />
  );
}

export default App;
