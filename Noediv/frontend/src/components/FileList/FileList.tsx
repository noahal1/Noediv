import React, { useState } from 'react';
import { ErrorBoundary } from '../ErrorBoundary/ErrorBoundary';
import ArtPlayer from '../ArtPlayer';

interface SelectedFile {
  id: string;
  type: 'video' | 'audio';
}

export const FileList = () => {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [loadingError, setLoadingError] = useState<Error | null>(null);
  const [playerKey, setPlayerKey] = useState(Date.now()); // 添加key用于强制重新渲染

  const handlePlayerError = () => {
    console.error('播放器错误');
    setLoadingError(new Error('播放失败'));
    setPlayerKey(Date.now()); // 更新key强制重新渲染播放器
  };

  const retryLoading = () => {
    setLoadingError(null);
    setPlayerKey(Date.now()); // 更新key强制重新渲染播放器
  };

  return (
    <div className="file-list-container">
      {loadingError ? (
        <div className="error-message">
          <h3>数据加载失败</h3>
          <p>{loadingError.message}</p>
          <button onClick={retryLoading}>重试</button>
        </div>
      ) : (
        <ErrorBoundary 
          fallback={
            <div className="player-error">
              <h3>视频加载失败</h3>
              <button onClick={retryLoading}>重新加载</button>
            </div>
          }
        >
          {selectedFile && (
            <ArtPlayer
              key={playerKey}
              src={`/api/raw/${selectedFile.id}`}
              type={selectedFile.type}
              onError={handlePlayerError}
            />
          )}
        </ErrorBoundary>
      )}
    </div>
  );
};