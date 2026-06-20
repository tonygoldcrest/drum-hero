import { Spin } from 'antd';
import { Outlet } from 'react-router-dom';
import { SongFilter } from '../components/SongFilter';
import { SongList } from '../components/SongList';
import { SettingsButton } from '../components/SettingsButton';
import { SortButton } from '../components/SortButton';
import { SplittingQueue } from '../components/SplittingQueue';
import { EmptySongState } from '../components/EmptySongState';
import { useApp } from '../context/AppContext';
import { useStemTools } from '../hooks/useStemTools';
import { useSongList } from '../hooks/useSongList';
import { useDownload } from '../hooks/useDownload';
import { useSongFilter } from '../hooks/useSongFilter';

export function SongListView() {
  const { currentPath } = useApp();
  const { stemToolsStatus, stemToolsLoading, downloadPercent, download } =
    useStemTools();
  const {
    songList,
    splittingIds,
    splitProgress,
    handleSplit,
    handleLikeChange,
    addSong,
  } = useSongList();
  const {
    nameFilter,
    setNameFilter,
    mode,
    setMode,
    sort,
    setSort,
    filteredSongList,
    onlineResults,
    onlineTotal,
    onlineLoading,
    loadMore,
  } = useSongFilter(songList);
  const { downloadingIds, handleDownload } = useDownload(
    onlineResults,
    addSong,
  );

  return (
    <div className="h-screen flex flex-col bg-bg">
      <div
        className="border-b border-divider p-4 z-10 flex flex-col gap-4"
        style={{ background: 'var(--gradient-header)' }}
      >
        <div className="flex gap-2 items-center">
          <SongFilter
            nameFilter={nameFilter}
            onChangeFilter={setNameFilter}
            filteredSongsCount={
              mode === 'online' && onlineTotal !== undefined
                ? onlineTotal
                : filteredSongList.length
            }
            mode={mode}
            onChangeMode={setMode}
          />
          {mode !== 'online' && (
            <SortButton sort={sort} onSortChange={setSort} />
          )}
          <SettingsButton
            page="song-list"
            stemToolsStatus={stemToolsStatus}
            stemToolsLoading={stemToolsLoading}
            downloadPercent={downloadPercent}
            onDownloadStemTools={download}
          />
        </div>
        <SplittingQueue
          splittingIds={splittingIds}
          splitProgress={splitProgress}
          songList={songList}
        />
      </div>

      <div className="relative grow overflow-hidden w-full flex">
        <div className="relative w-full max-w-250 grow overflow-hidden mx-auto bg-bg flex flex-col">
          {filteredSongList.length > 0 ||
          (mode === 'online' && onlineLoading) ? (
            <SongList
              songList={filteredSongList}
              scrollKey={nameFilter}
              downloadingIds={downloadingIds}
              downloadingDisabled={currentPath === null}
              mode={mode}
              stemToolsStatus={stemToolsStatus}
              downloadedIds={
                mode === 'online'
                  ? new Set(songList.map((s) => s.id))
                  : undefined
              }
              splittingIds={splittingIds}
              onSplit={handleSplit}
              onDownload={handleDownload}
              onLikeChange={handleLikeChange}
              onLoadMore={mode === 'online' ? loadMore : undefined}
            />
          ) : (
            <EmptySongState mode={mode} />
          )}
        </div>

        {mode === 'online' && onlineLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none z-10">
            <Spin />
          </div>
        )}
      </div>

      <div className="fixed inset-0 pointer-events-none z-100">
        <Outlet />
      </div>
    </div>
  );
}
