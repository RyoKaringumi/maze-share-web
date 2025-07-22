import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'

interface Wall {
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
}

interface MazeData {
  width: number
  height: number
  walls: Wall[][]
  start: { x: number; y: number }
  goal: { x: number; y: number }
}

interface GameStats {
  steps: number
  startTime: number | null
  endTime: number | null
}

const createDefaultMaze = (width: number, height: number): MazeData => {
  const walls: Wall[][] = []
  for (let y = 0; y < height; y++) {
    walls[y] = []
    for (let x = 0; x < width; x++) {
      walls[y][x] = {
        top: true,
        right: true,
        bottom: true,
        left: true
      }
    }
  }
  return {
    width,
    height,
    walls,
    start: { x: 0, y: 0 },
    goal: { x: width - 1, y: height - 1 }
  }
}

const encodeMaze = (maze: MazeData): string => {
  const data = {
    w: maze.width,
    h: maze.height,
    s: [maze.start.x, maze.start.y],
    g: [maze.goal.x, maze.goal.y],
    walls: maze.walls.flat().map(w => 
      (w.top ? 1 : 0) + (w.right ? 2 : 0) + (w.bottom ? 4 : 0) + (w.left ? 8 : 0)
    )
  }
  return btoa(JSON.stringify(data))
}

const decodeMaze = (encoded: string): MazeData | null => {
  try {
    const data = JSON.parse(atob(encoded))
    const walls: Wall[][] = []
    for (let y = 0; y < data.h; y++) {
      walls[y] = []
      for (let x = 0; x < data.w; x++) {
        const wallData = data.walls[y * data.w + x]
        walls[y][x] = {
          top: !!(wallData & 1),
          right: !!(wallData & 2),
          bottom: !!(wallData & 4),
          left: !!(wallData & 8)
        }
      }
    }
    return {
      width: data.w,
      height: data.h,
      walls,
      start: { x: data.s[0], y: data.s[1] },
      goal: { x: data.g[0], y: data.g[1] }
    }
  } catch {
    return null
  }
}

function App() {
  const [mode, setMode] = useState<'edit' | 'play'>('edit')
  const [maze, setMaze] = useState<MazeData>(() => createDefaultMaze(10, 10))
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 })
  const [stats, setStats] = useState<GameStats>({ steps: 0, startTime: null, endTime: null })
  const [isCompleted, setIsCompleted] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState<'wall' | 'start' | 'goal' | null>(null)
  const [dragType, setDragType] = useState<'remove' | 'add'>('remove')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const cellSize = 50
  const wallWidth = 3

  const drawMaze = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = maze.width * cellSize
    canvas.height = maze.height * cellSize

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // グリッドを描画
    ctx.strokeStyle = '#ddd'
    ctx.lineWidth = 1
    for (let x = 0; x <= maze.width; x++) {
      ctx.beginPath()
      ctx.moveTo(x * cellSize, 0)
      ctx.lineTo(x * cellSize, maze.height * cellSize)
      ctx.stroke()
    }
    for (let y = 0; y <= maze.height; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * cellSize)
      ctx.lineTo(maze.width * cellSize, y * cellSize)
      ctx.stroke()
    }

    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        const wall = maze.walls[y][x]
        const cellX = x * cellSize
        const cellY = y * cellSize

        const isFullWall = wall.top && wall.right && wall.bottom && wall.left
        
        if (isFullWall) {
          ctx.fillStyle = '#333'
          ctx.fillRect(cellX, cellY, cellSize, cellSize)
        } else {
          ctx.fillStyle = '#fff'
          ctx.fillRect(cellX, cellY, cellSize, cellSize)

          ctx.strokeStyle = '#333'
          ctx.lineWidth = wallWidth

          if (wall.top) {
            ctx.beginPath()
            ctx.moveTo(cellX, cellY)
            ctx.lineTo(cellX + cellSize, cellY)
            ctx.stroke()
          }
          if (wall.right) {
            ctx.beginPath()
            ctx.moveTo(cellX + cellSize, cellY)
            ctx.lineTo(cellX + cellSize, cellY + cellSize)
            ctx.stroke()
          }
          if (wall.bottom) {
            ctx.beginPath()
            ctx.moveTo(cellX, cellY + cellSize)
            ctx.lineTo(cellX + cellSize, cellY + cellSize)
            ctx.stroke()
          }
          if (wall.left) {
            ctx.beginPath()
            ctx.moveTo(cellX, cellY)
            ctx.lineTo(cellX, cellY + cellSize)
            ctx.stroke()
          }
        }

        if (x === maze.start.x && y === maze.start.y) {
          // グラデーション背景
          const gradient = ctx.createLinearGradient(cellX, cellY, cellX + cellSize, cellY + cellSize)
          gradient.addColorStop(0, '#ff6b6b')
          gradient.addColorStop(1, '#ee5a52')
          ctx.fillStyle = gradient
          ctx.fillRect(cellX + 8, cellY + 8, cellSize - 16, cellSize - 16)
          
          // 白い縁取り
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 2
          ctx.strokeRect(cellX + 8, cellY + 8, cellSize - 16, cellSize - 16)
          
          ctx.fillStyle = '#fff'
          ctx.font = 'bold 18px Comic Neue, cursive'
          ctx.textAlign = 'center'
          ctx.fillText('🚀', cellX + cellSize / 2, cellY + cellSize / 2 + 6)
        }

        if (x === maze.goal.x && y === maze.goal.y) {
          // グラデーション背景
          const gradient = ctx.createLinearGradient(cellX, cellY, cellX + cellSize, cellY + cellSize)
          gradient.addColorStop(0, '#feca57')
          gradient.addColorStop(1, '#ff9ff3')
          ctx.fillStyle = gradient
          ctx.fillRect(cellX + 8, cellY + 8, cellSize - 16, cellSize - 16)
          
          // 白い縁取り
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 2
          ctx.strokeRect(cellX + 8, cellY + 8, cellSize - 16, cellSize - 16)
          
          ctx.fillStyle = '#fff'
          ctx.font = 'bold 18px Comic Neue, cursive'
          ctx.textAlign = 'center'
          ctx.fillText('🏆', cellX + cellSize / 2, cellY + cellSize / 2 + 6)
        }

        if (mode === 'play' && x === playerPos.x && y === playerPos.y) {
          // グラデーションプレイヤー
          const gradient = ctx.createRadialGradient(
            cellX + cellSize / 2, cellY + cellSize / 2, 0,
            cellX + cellSize / 2, cellY + cellSize / 2, 12
          )
          gradient.addColorStop(0, '#74b9ff')
          gradient.addColorStop(1, '#0984e3')
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(cellX + cellSize / 2, cellY + cellSize / 2, 12, 0, 2 * Math.PI)
          ctx.fill()
          
          // 白い縁取り
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 2
          ctx.stroke()
        }
      }
    }
  }, [maze, mode, playerPos])

  useEffect(() => {
    drawMaze()
  }, [drawMaze])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (mode !== 'play' || isCompleted) return

      const { x, y } = playerPos
      let newX = x
      let newY = y

      switch (e.key) {
        case 'ArrowUp':
          if (!maze.walls[y][x].top) newY = y - 1
          break
        case 'ArrowDown':
          if (!maze.walls[y][x].bottom) newY = y + 1
          break
        case 'ArrowLeft':
          if (!maze.walls[y][x].left) newX = x - 1
          break
        case 'ArrowRight':
          if (!maze.walls[y][x].right) newX = x + 1
          break
      }

      if (newX !== x || newY !== y) {
        if (newX >= 0 && newX < maze.width && newY >= 0 && newY < maze.height) {
          setPlayerPos({ x: newX, y: newY })
          setStats(prev => ({
            ...prev,
            steps: prev.steps + 1,
            startTime: prev.startTime || Date.now()
          }))

          if (newX === maze.goal.x && newY === maze.goal.y) {
            setIsCompleted(true)
            setStats(prev => ({
              ...prev,
              endTime: Date.now()
            }))
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [mode, playerPos, maze, isCompleted])



  const saveMaze = async (toClipboard: boolean) => {
    const encoded = encodeMaze(maze)
    if (toClipboard) {
      await navigator.clipboard.writeText(encoded)
      alert('迷路データをクリップボードにコピーしました')
    } else {
      const blob = new Blob([encoded], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'maze.txt'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const loadMaze = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const decoded = decodeMaze(text)
      if (decoded) {
        setMaze(decoded)
        alert('迷路を読み込みました')
      } else {
        alert('無効な迷路データです')
      }
    } catch {
      alert('クリップボードから読み込めませんでした')
    }
  }

  const getElapsedTime = () => {
    if (!stats.startTime) return 0
    const endTime = stats.endTime || Date.now()
    return Math.floor((endTime - stats.startTime) / 1000)
  }

  const getCellFromMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / cellSize)
    const y = Math.floor((e.clientY - rect.top) / cellSize)
    
    if (x >= 0 && x < maze.width && y >= 0 && y < maze.height) {
      return { x, y }
    }
    return null
  }

  const getWallFromMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    const cellX = Math.floor(mouseX / cellSize)
    const cellY = Math.floor(mouseY / cellSize)
    
    const relX = mouseX - (cellX * cellSize)
    const relY = mouseY - (cellY * cellSize)
    
    if (cellX < 0 || cellX >= maze.width || cellY < 0 || cellY >= maze.height) return null
    
    if (relX < 12) {
      return { x: cellX, y: cellY, wall: 'left' as const }
    } else if (relX > cellSize - 12) {
      return { x: cellX, y: cellY, wall: 'right' as const }
    } else if (relY < 12) {
      return { x: cellX, y: cellY, wall: 'top' as const }
    } else if (relY > cellSize - 12) {
      return { x: cellX, y: cellY, wall: 'bottom' as const }
    }
    
    return null
  }

  const toggleWall = (x: number, y: number, wall: 'top' | 'right' | 'bottom' | 'left', remove: boolean) => {
    setMaze(prev => {
      const newWalls = prev.walls.map(row => row.map(cell => ({ ...cell })))
      
      if (remove) {
        newWalls[y][x][wall] = false
        
        if (wall === 'top' && y > 0) {
          newWalls[y - 1][x].bottom = false
        } else if (wall === 'bottom' && y < prev.height - 1) {
          newWalls[y + 1][x].top = false
        } else if (wall === 'left' && x > 0) {
          newWalls[y][x - 1].right = false
        } else if (wall === 'right' && x < prev.width - 1) {
          newWalls[y][x + 1].left = false
        }
      } else {
        newWalls[y][x][wall] = true
        
        if (wall === 'top' && y > 0) {
          newWalls[y - 1][x].bottom = true
        } else if (wall === 'bottom' && y < prev.height - 1) {
          newWalls[y + 1][x].top = true
        } else if (wall === 'left' && x > 0) {
          newWalls[y][x - 1].right = true
        } else if (wall === 'right' && x < prev.width - 1) {
          newWalls[y][x + 1].left = true
        }
      }
      
      return { ...prev, walls: newWalls }
    })
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'edit') return
    
    e.preventDefault()
    e.stopPropagation()
    const isRightClick = e.button === 2
    
    const cell = getCellFromMouse(e)
    if (cell) {
      // スタート・ゴール地点の優先チェック（より広範囲で検知）
      if (cell.x === maze.start.x && cell.y === maze.start.y) {
        setDragMode('start')
        setIsDragging(true)
        return
      }
      
      if (cell.x === maze.goal.x && cell.y === maze.goal.y) {
        setDragMode('goal')
        setIsDragging(true)
        return
      }
    }
    
    // 壁の編集
    const wallInfo = getWallFromMouse(e)
    if (wallInfo) {
      setDragMode('wall')
      setDragType(isRightClick ? 'add' : 'remove')
      setIsDragging(true)
      toggleWall(wallInfo.x, wallInfo.y, wallInfo.wall, !isRightClick)
    } else if (cell) {
      // 壁が検出されなかった場合でも、セル内であればドラッグ開始
      setDragMode('wall')
      setDragType(isRightClick ? 'add' : 'remove')
      setIsDragging(true)
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'edit' || !isDragging) return
    
    e.preventDefault()
    
    if (dragMode === 'wall') {
      const wallInfo = getWallFromMouse(e)
      if (wallInfo) {
        toggleWall(wallInfo.x, wallInfo.y, wallInfo.wall, dragType === 'remove')
      }
    } else if (dragMode === 'start' || dragMode === 'goal') {
      const cell = getCellFromMouse(e)
      if (cell) {
        setMaze(prev => ({
          ...prev,
          [dragMode]: { x: cell.x, y: cell.y }
        }))
      }
    }
  }

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setIsDragging(false)
    setDragMode(null)
  }

  const handleCanvasMouseLeave = () => {
    setIsDragging(false)
    setDragMode(null)
  }

  const handleCanvasContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
  }

  return (
    <div className="maze-container">
      <h1 className="title">🎯 MazeShare 🎯</h1>
      
      <div className="button-group">
        <button 
          className="fun-button primary"
          onClick={() => {
            if (mode === 'edit') {
              setMode('play')
              setPlayerPos({ x: maze.start.x, y: maze.start.y })
              setStats({ steps: 0, startTime: null, endTime: null })
              setIsCompleted(false)
            } else {
              setMode('edit')
              setIsCompleted(false)
            }
          }}
        >
          {mode === 'edit' ? '🎮 プレイする！' : '✏️ 編集する！'}
        </button>
        
        {mode === 'edit' && (
          <>
            <button className="fun-button secondary" onClick={() => saveMaze(true)}>
              📋 クリップボードに保存
            </button>
            <button className="fun-button success" onClick={() => saveMaze(false)}>
              💾 ファイル保存
            </button>
            <button className="fun-button warning" onClick={loadMaze}>
              📥 読み込み
            </button>
          </>
        )}
      </div>

      {mode === 'play' && (
        <div className="stats-container">
          <div className="stats-item">🚶‍♂️ ステップ: {stats.steps}</div>
          <div className="stats-item">⏱️ 時間: {getElapsedTime()}秒</div>
          {isCompleted && (
            <div className="completion-message">
              🎉 おめでとう！ゴール達成！ 🎉
            </div>
          )}
          {!isCompleted && (
            <div style={{ marginTop: '10px', fontSize: '16px' }}>
              🔄 矢印キーで移動してください
            </div>
          )}
        </div>
      )}

      {mode === 'edit' && (
        <div className="instructions">
          <p>🖱️ 左クリックドラッグ: 壁を削除</p>
          <p>🖱️ 右クリックドラッグ: 壁を追加</p>
          <p>🚀 スタート地点とゴール地点🏆はドラッグで移動できます</p>
        </div>
      )}

      <div className="maze-canvas">
        <canvas
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseLeave}
          onContextMenu={handleCanvasContextMenu}
        />
      </div>
    </div>
  )
}

export default App
