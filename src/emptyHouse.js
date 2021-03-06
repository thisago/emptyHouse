// title:  Empty House
// author: Thiago Navarro
// desc:   The house is burning and someone is trowing everything
// script: js

/*
  Idea: a magnet powerup that
  attracts every food
*/

// CONFIGS
const screen = { h: 136, w: 240 },
  tileSize = 8,
  transparentColor = 0,
  invencibleTime = 100,
  startScore = 0,
  liveScoreInc = 50,
  defaultLives = 3,
  playerSpriteUpdate = 60,
  startPos = {
    x: screen.w / 2 - tileSize,
    y: screen.h - tileSize * 3,
  },
  ground = {
    w: screen.w,
    h: 8 * tileSize + 1,
  },
  slomoDiv = 5, //slow motion power; more is slower
  r = Math.floor(Math.random() * 30)
;(slomoUpgradeMsg = "Slow Motion Upgraded! (+1s)"),
  (slomoUpgradeMaxMsg = "Slow Motion Upgraded! (+1s)\nMax reached"),
  (slomoLevels = [
    { dur: 2, score: 70 + r, msg: "Slow Motion Unlocked!" },
    { dur: 3, score: 120 + r, msg: slomoUpgradeMsg },
    { dur: 4, score: 180 + r, msg: slomoUpgradeMsg },
    { dur: 5, score: 240 + r, msg: slomoUpgradeMsg },
    { dur: 6, score: 350 + r, msg: slomoUpgradeMsg },
    { dur: 7, score: 460 + r, msg: slomoUpgradeMaxMsg },
  ]),
  (slomoReloadTime = 100),
  (slomoUseTime = 60),
  //MENU
  (menuItems = {
    "Start Game": startGame,
    "Reset Stats": function () {
      maxScore = 0
      tries = 0
      revolutionPassed = 0
    },
    "View Controls": showControls,
    "View All Obstacles": showItems,
  }),
  (menuItemsKeys = Object.keys(menuItems))
;(menuConfig = {
  selected: "> $ <",
  unselected: "  $",
  x: 47,
  y: 60,
  gap: 10,
}),
  (menuSelected = 0),
  //food
  (foodSpawnTime = 0)
;(foodSpawnMax = 2), (foodVelMod = 0.1), (foodDisapearTime = 500) //ticks

//night
const isNight = false,
  revolutionTime = 6000,
  revolutionPassed = 0
function redrawBg(tiles) {
  return function (tile, x, y) {
    if (isNight)
      if (tile >= 64 && tile <= 70) tile += 48
      else if (tiles.indexOf(tile) >= 0) tile += 112
    return tile
  }
}
function updateRevolution() {
  if (rt == 0) return
  if (rt % revolutionTime == 0) {
    isNight = !isNight
    if (!isNight) revolutionPassed++
  }
}

//save
const mem_maxScore = 0,
  mem_tries = 1,
  mem_revolutions = 2

function saveMem() {
  pmem(mem_maxScore, maxScore)
  pmem(mem_tries, tries)
  pmem(mem_revolutions, revolutionPassed)
}
function getMem() {
  maxScore = pmem(mem_maxScore)
  tries = pmem(mem_tries)
  revolutionPassed = pmem(mem_revolutions)
}

// dificulty
var score = 0 // def here for correct first calc
var obstacleSpawnTime = 0,
  obstacleSpawnMax = 0,
  obstacleMaxSpeed = 0,
  obstacleMinSpeed = 0.3,
  obstacleMaxSize = 0,
  obstacleMinSize = 0

function updateDifficulty() {
  obstacleSpawnTime = 200 - score * 2
  if (obstacleSpawnTime < 1) obstacleSpawnTime = 1

  obstacleSpawnMax = 2 + Math.floor(score / 15)
  if (obstacleSpawnMax > 6) obstacleSpawnMax = 6

  obstacleMaxSpeed = 1 + Math.floor(score / 80)
  if (obstacleMaxSpeed > 3) obstacleMaxSpeed = 3

  obstacleMaxSize = sprite.obstacle.length

  //food
  foodSpawnTime = 300 - score
  if (foodSpawnTime < 1) foodSpawnTime = 1

  foodSpawnMax = 2 + Math.floor(score / 30)
  if (foodSpawnTime > 100) foodSpawnMax = 100
}

// UTILS
function newSpr(id, w, h, scale) {
  scale = scale ? scale : 2
  w = w ? w : 1
  h = h ? h : 1
  return [id, w, h, scale]
}
function newMap(x, y, w, h, scale) {
  scale = scale ? scale : 2
  return [x, y, w, h, scale]
}
function spriteSize(s) {
  return {
    w: s[1] * tileSize * s[3],
    h: s[2] * tileSize * s[3],
  }
}
function mapSize(s) {
  return {
    w: s[2] * tileSize * s[4],
    h: s[3] * tileSize * s[4],
  }
}
function drawSpr(s, x, y, flip, rot) {
  rot = rot ? rot : 0
  flip = flip ? flip : 0
  spr(s[0], x, y, transparentColor, s[3], flip, rot, s[1], s[2])
}
function drawMap(m, x, y, flip, rot) {
  rot = rot ? rot : 0
  flip = flip ? flip : 0
  map(
    m[0],
    m[1],
    m[2],
    m[3],
    x,
    y,
    transparentColor,
    m[4],
    function (tile, x, y) {
      if (m[2] == 1 && m[3] == 1) return [tile, flip, rot]
      return tile
    }
  )
}
//colision

function overlaps(p1, len1, p2, len2) {
  const high = Math.max(p1, p2)
  const low = Math.min(p1 + len1, p2 + len2)
  return high < low
}
function collides(obstacle) {
  if (
    overlaps(
      player.pos.x,
      player.size.w - tileSize,
      obstacle.pos.x,
      obstacle.size.w
    ) &&
    overlaps(
      player.pos.y,
      player.size.h - tileSize,
      obstacle.pos.y,
      obstacle.size.h
    )
  )
    return true
  return false
}

// SPRITES
const sprite = {
  player: {
    idle: [newSpr(1), newSpr(17)],
    walk: [newSpr(2), newSpr(18)],
  },
  obstacle: [
    newMap(40, 4, 2, 1, 2), //table
    newMap(39, 1, 1, 1, 2), //oven
    newMap(36, 1, 3, 1, 1), //iron bar
    newMap(41, 1, 2, 1, 2), //door
    newMap(40, 1, 1, 1, 1), //telephone
    newMap(36, 2, 3, 1, 2), //wood plank
    newMap(36, 3, 1, 1, 1), //toy car
    newMap(37, 3, 1, 1, 1), //flower pot
    newMap(38, 3, 1, 1, 1), //water pot
    newMap(39, 2, 1, 2, 2), //fridge
    newMap(40, 2, 1, 1, 2), //fish bowl
    newMap(41, 2, 2, 1, 1), //hoverboard
    newMap(40, 3, 1, 1, 2), //chair
    newMap(41, 3, 1, 1, 2), //trash can
    newMap(43, 3, 6, 1, 2), //ladder
    newMap(42, 3, 1, 2, 1), //light
    newMap(36, 4, 2, 1, 2), //sofa
    newMap(38, 4, 2, 1, 1), //broom
    newMap(30, 2, 4, 1, 1), //iron bar
    newMap(30, 3, 5, 1, 1), //iron bar
    newMap(30, 4, 6, 1, 1), //iron bar
    newMap(30, 5, 7, 1, 1), //iron bar
    newMap(30, 6, 8, 1, 1), //iron bar
    newMap(30, 7, 9, 1, 1), //iron bar
    newMap(30, 8, 10, 1, 1), //iron bar
    newMap(38, 5, 2, 1, 2), //bed
    newMap(43, 4, 1, 2, 1), //umbrella
    newMap(43, 1, 1, 1, 1), //vase
    newMap(44, 1, 1, 1, 1), //sand bucket
    newMap(43, 2, 1, 1, 1), //water bucket
    newMap(44, 2, 1, 1, 2), //toilet
    newMap(45, 1, 1, 1, 1), //liquid soup
    newMap(45, 2, 1, 1, 1), //mirror
    newMap(46, 1, 1, 2, 1), //hoe/rastelo
    newMap(47, 1, 1, 2, 1), //shovel
    newMap(48, 1, 1, 2, 1), //pickaxe
    newMap(44, 4, 1, 1, 1), //ash
    newMap(44, 5, 1, 1, 1), //torch
    newMap(45, 4, 1, 3, 1), //post
    newMap(46, 4, 1, 2, 1), //trass can
    newMap(49, 1, 2, 1, 1), //seats
    newMap(46, 6, 1, 1, 1), //tap
    newMap(47, 6, 1, 1, 1), //campfire
    newMap(47, 5, 1, 1, 1), //keys
    newMap(48, 5, 1, 1, 1), //lock
    newMap(48, 6, 1, 1, 1), //painting
    newMap(49, 2, 1, 1, 1), //colorful ball
    newMap(47, 4, 1, 1, 1), //lighter
    //newMap(49,1,2,1,1),//
  ],
  food: {
    good: [
      newMap(30, 12, 1, 1, 1), //apple
      newMap(31, 12, 1, 1, 1), //banana
      newMap(32, 12, 1, 1, 1), //avocado
      newMap(33, 12, 1, 1, 1), //watermelon
      newMap(34, 12, 1, 1, 1), //coffee
      newMap(35, 12, 1, 1, 1), //unknown fruit
      newMap(36, 12, 1, 1, 1), //papaya
      newMap(37, 12, 1, 1, 1), //tomato
      newMap(38, 12, 1, 1, 1), //egg
      newMap(39, 12, 1, 1, 1), //grapes
      newMap(40, 12, 1, 1, 1), //carrot
      newMap(41, 11, 1, 2, 1), //pineapple
      newMap(42, 12, 1, 1, 1), //eggplant
    ],
    bad: [
      newMap(30, 13, 1, 1, 1), //cereal
      newMap(31, 13, 1, 1, 1), //lolipop
      newMap(32, 13, 1, 1, 1), //candy
      newMap(33, 13, 1, 1, 1), //cereal bar
      newMap(34, 13, 1, 1, 1), //ice cream
      newMap(35, 13, 1, 1, 1), //white chocolate
      newMap(36, 13, 1, 1, 1), //hamburguer
      newMap(37, 13, 1, 1, 1), //black juice
      newMap(38, 13, 1, 1, 1), //red juice
      newMap(39, 13, 1, 1, 1), //purple juice
      newMap(40, 13, 1, 1, 1), //yogurt
    ],
  },
}

const rooms = [
  /*[[posx,posy,redrawfn?],...]*/
  [
    [0, 0, redrawBg([16, 32, 48, 33, 49, 34, 50])],
    [0, 17],
  ],
  [
    [60, 0, redrawBg([28])],
    [60, 17],
  ],
  [
    [90, 0, redrawBg([28])],
    [90, 17],
  ],
]
doors = [
  /*[room,[x,y],toroom]*/
  [0, [9, 8], 1],
  [0, [21, 8], 2],
  [0, [22, 8], 2],
  [2, [6, 8], 0],
  [2, [7, 8], 0],
  [1, [20, 8], 0],
]
var room = 0

function doorObj(door) {
  return {
    pos: {
      x: door[1][0] * tileSize,
      y: door[1][1] * tileSize,
    },
    size: {
      w: 1,
      h: 2,
    },
  }
}

function getDoor(curr, next) {
  for (var i = 0; i < doors.length; i++) {
    const door = doors[i]
    if (curr == door[2] && next == door[0]) return door
  }
  //return [0,[0,0],0]
}

function enterDoor() {
  for (var i = 0; i < doors.length; i++) {
    const door = doors[i]
    if (door[0] != room) continue
    const obj = doorObj(door)
    //rect(obj.pos.x,obj.pos.y,obj.size.w,obj.size.h,1)
    //rect(obj.pos.x,obj.pos.y,8,8,1)
    if (collides(obj)) {
      sfx(6, 20, 10, 2)
      obstacles = []
      foods = []
      const exitDoor = doorObj(getDoor(room, door[2]))
      player.pos.x = exitDoor.pos.x
      player.pos.y = exitDoor.pos.y + tileSize
      room = door[2]
      break
    }
  }
}

var t = 0,
  rt = 0

// PLAYER
function walking(p) {
  return p.dir.x != 0 || p.dir.y != 0
}
function facing(p) {
  return p.lastDir.x == -1
}
const player = {
  pos: { x: startPos.x, y: startPos.y },
  speed: 1,
  maxSpeed: 2,
  realSpeed: 0,
  dir: { x: 0, y: 0 },
  lastDir: { x: 0, y: 0 },
  notRunMulti: 0.7,
  state: {
    walking: false,
    invencible: 0, // Invencible per 100 ticks
    running: false,
    lives: defaultLives,
    nextLife: liveScoreInc,
  },
  size: spriteSize(sprite.player.idle[0]),
  fn: {
    draw: function () {
      var j = playerSpriteUpdate / Math.round(player.realSpeed),
        a = rt % j,
        len = sprite.player.idle.length,
        index = Math.floor((a / j) * len)
      var s = sprite.player.idle[index]
      if (player.state.walking || player.state.running) {
        ;(len = sprite.player.walk.length), (index = Math.floor((a / j) * len))
        s = sprite.player.walk[index]
        if (rt % (j / 2) == 0) sfx(0, 20 + index, 10, 0, 6)
      }
      if (player.state.invencible > 0 && rt % 20 < 8) return
      drawSpr(s, player.pos.x, player.pos.y, facing(player))
      player.state.walking = false //TODO fix this, have to do another way to stop walking on menu
    },
    update: function () {
      // reset player direction
      player.dir.y = 0
      player.dir.x = 0

      // get directional buttons value
      if (btn(0)) player.dir.y = -1
      if (btn(1)) player.dir.y = 1
      if (btn(2)) player.dir.x = -1
      if (btn(3)) player.dir.x = 1

      player.state.running = btn(7)

      // save walking state
      player.state.walking = walking(player)

      player.realSpeed = player.speed
      // change player position based on direction button
      // pressed
      if (!player.state.running) player.realSpeed *= player.notRunMulti

      player.pos.y += player.realSpeed * player.dir.y
      player.pos.x += player.realSpeed * player.dir.x

      // limit to getbout canvas
      if (player.pos.x <= -4) player.pos.x = -4
      if (player.pos.x >= ground.w - player.size.w + 4)
        player.pos.x = ground.w - player.size.w + 4
      if (player.pos.y <= ground.h) player.pos.y = ground.h
      if (player.pos.y >= screen.h - player.size.h)
        player.pos.y = screen.h - player.size.h

      // If dir changed, set the last one
      if (player.dir.x != 0) player.lastDir.x = player.dir.x
      if (player.dir.y != 0) player.lastDir.y = player.dir.y

      // decrease invencibility time
      if (player.state.invencible > 0) player.state.invencible--

      enterDoor()
    },
    resetStat: function () {
      player.pos.x = startPos.x
      player.pos.y = startPos.y
      player.speed = 1
      player.state.lives = defaultLives
      player.state.nextLife = liveScoreInc
    },
    addSpeed: function (x) {
      player.speed += x
      if (player.speed > player.maxSpeed) player.speed = player.maxSpeed
      if (player.speed < 0) player.speed = 0
    },
    hit: function () {
      if (player.state.lives == 0) {
        gameOver()
        return
      }
      sfx(0, 10)
      player.state.lives--
      player.state.invencible = invencibleTime
    },
    updateLives: function () {
      if (score >= player.state.nextLife) {
        sfx(5, 45, -1, 0)
        player.state.nextLife += liveScoreInc
        player.state.lives++
        player.state.invencible = invencibleTime
      }
    },
  },
}

// LOGS
var obstacles = []
function updateObstacles() {
  if (t % obstacleSpawnTime == 0 && obstacles.length <= obstacleSpawnMax)
    newObstacle()
  for (var i = 0; i < obstacles.length; i++) {
    const obstacle = obstacles[i]

    // move obstacle
    var s = obstacle.speed
    if (slomo) s /= slomoDiv
    obstacle.pos.y += s

    // delete the obstacle out of screen
    if (obstacle.pos.y >= screen.h + tileSize) {
      obstacles.splice(i, 1)
      incScore()
      sfx(3, 50 + Math.floor(Math.random() * 10), 5, 2, 3, 2)
    }

    // if collide, game over
    if (player.state.invencible == 0 && collides(obstacle)) player.fn.hit()
  }
}
function drawObstacles() {
  for (var i = 0; i < obstacles.length; i++) {
    const obstacle = obstacles[i]
    drawMap(
      sprite.obstacle[obstacle.spriteIndex],
      obstacle.pos.x,
      obstacle.pos.y,
      obstacle.flip,
      obstacle.rot
    )
  }
}
function newObstacle() {
  const spriteIndex = Math.floor(
    Math.random() * (obstacleMaxSize - obstacleMinSize) + obstacleMinSize
  )
  const speed =
    Math.random() * (obstacleMaxSpeed - obstacleMinSpeed) + obstacleMinSpeed
  const size = mapSize(sprite.obstacle[spriteIndex])
  const x = Math.floor(Math.random() * (screen.w - size.w))
  const flip = Math.floor(Math.random() * 4)
  const rot = Math.floor(Math.random() * 4)

  obstacles.push({
    speed: speed,
    pos: { x: x, y: -size.h },
    size: size,
    spriteIndex: spriteIndex,
    rot: rot,
    flip: flip,
  })
}

// HUD
var // score defined in top
  maxScore = 0
tries = 0
function hudLoop() {
  print("Score:" + score, 50, 2)
  print("Lives:" + player.state.lives, 2, 2)
  print("Speed:" + player.speed.toFixed(1), 110, 2)
  if (slomoSeconds > 0) print("Slomo time:" + slomoActiveTime, 165, 2)
  else {
    const missing = slomoLevels[0].score - score
    if (missing > 0) print("Get slomo:" + missing, 165, 2)
  }
}
function incScore() {
  score += 1
  if (maxScore < score) maxScore = score

  slomoUnlock()
  player.fn.updateLives()
}

// MENU
var gameStarted = false,
  canSelectMenu = true,
  menuPressed = false
function updateMenu() {
  print("Score:" + score, 2, 2)
  print("Max score:" + maxScore, 80, 2)
  print("Tries:" + tries, 190, 2)
  print("Days Passed:" + revolutionPassed, 75, 10)
  print("Empty House", 55, 30, 15, false, 2)

  //print menu
  for (var i = 0; i < menuItemsKeys.length; i++) {
    const txt = menuItemsKeys[i]
    var tplt = menuConfig.unselected
    if (menuSelected == i) tplt = menuConfig.selected
    txt = tplt.replace("$", txt)
    print(txt, menuConfig.x, menuConfig.y + i * menuConfig.gap)
  }

  //click
  if (btn(4)) {
    //[A]
    menuItems[menuItemsKeys[menuSelected]]()
    showingMenu = false
  }
  //up
  else if (btn(0)) {
    //[UP]
    if (menuPressed) return
    if (menuSelected == 0) menuSelected = menuItemsKeys.length - 1
    else menuSelected--
    menuPressed = true
  }
  //down
  else if (btn(1)) {
    //[DOWN]
    if (menuPressed) return
    if (menuSelected == menuItemsKeys.length - 1) menuSelected = 0
    else menuSelected++
    menuPressed = true
  } else menuPressed = false
}

// END GAME
function startGame() {
  //clean all states
  gameStarted = true
  obstacles = []
  foods = []
  score = startScore
  player.state.invencible = invencibleTime
  player.fn.resetStat()
  slomoSeconds = 0
  r = Math.floor(Math.random() * 30)
  rt = t = 0
  isNight = false
}
function gameOver() {
  sfx(2, 10, 10)
  //clean some states
  gameStarted = false
  tries++
  player.fn.resetStat()
  slomo = false
  saveMem()
}

//SHOW ITEMS
var showingItems = false
function showItems() {
  showingItems = true
}
function drawItems() {
  const gap = 8
  var x = gap,
    y = gap,
    lastSize
  for (var i = 0; i < sprite.obstacle.length; i++) {
    const item = sprite.obstacle[i],
      size = mapSize(item)

    if (x + size.w > screen.w) {
      y += lastSize.h + gap
      x = gap
    }
    print(i + 1, x, y - 5)
    drawMap(item, x, y)
    x += size.w + gap
    lastSize = size
  }

  if (btn(5))
    //[B]
    showingItems = false
}

//Pause
var paused = false,
  pausePressed = false,
  pauseMessage = null
function pauseLoop() {
  if (btnp(5)) {
    if (pausePressed == false) {
      paused = !paused
      pausePressed = true
      if (paused == false && pauseMessage != null) pauseMessage = null
    }
  } else pausePressed = false
  if (paused) {
    print("PAUSED", 5, 20, 2, false, 1)
    if (pauseMessage != null)
      print(
        pauseMessage.msg,
        pauseMessage.x,
        pauseMessage.y,
        rt % 60 > 30 ? 15 : 9,
        false,
        1
      )
  }
}
function msg(s, x, y) {
  sfx(4, 30)
  pauseMessage = {
    msg: s,
    x: x,
    y: y,
  }
  paused = true
}

//slow motion
var slomo = false,
  slomoPressed = false,
  slomoSeconds = 0,
  slomoActiveTime = 0
function slomoLoop() {
  if (slomoSeconds == 0) return
  if (btnp(6)) {
    if (slomoPressed == false) {
      slomo = !slomo
      slomoPressed = true
    }
  } else {
    slomoPressed = false
  }
  if (slomo) {
    if (slomoActiveTime <= 0) slomo = false

    print("Slow Motion", 5, 30, 4, false, 1)
    if (!paused && rt % slomoUseTime == 0 && slomoActiveTime > 0)
      slomoActiveTime--
  } else if (slomoActiveTime < slomoSeconds)
    if (!paused && rt % slomoReloadTime == 0) slomoActiveTime++
}
function slomoUnlock() {
  for (var i = 0; i < slomoLevels.length; i++) {
    const lvl = slomoLevels[i]

    if (score >= lvl.score) {
      if (lvl.dur <= slomoSeconds) continue
      msg(lvl.msg, 60, 60)
      slomoSeconds = lvl.dur
    }
  }
}

//Controls
var showingControls = false
function showControls() {
  showingControls = true
}
function drawControls() {
  print("Arrow keys: Move", 30, 20, 0, false, 2)
  print("[X]: Slow Motion", 30, 40, 0, false, 2)
  print("[B]: Pause/Back", 30, 60, 0, false, 2)
  print("[Y]: Run", 30, 80, 0, false, 2)
  print("Score " + liveScoreInc + " = 1 life", 30, 100, 0, false, 1)

  if (btn(5)) showingControls = false
}

//FOOD
var foods = []
function newFood() {
  var sprs = Math.random() >= 0.5 ? sprite.food.good : sprite.food.bad
  const s = sprs[Math.floor(Math.random() * sprs.length)]
  const size = mapSize(s)
  const x = Math.floor(Math.random() * (screen.w - size.w))
  const y = Math.floor(Math.random() * 40) + ground.h + tileSize
  const flip = Math.floor(Math.random() * 4)
  const rot = Math.floor(Math.random() * 4)

  foods.push({
    pos: { x: x, y: y },
    size: size,
    sprite: s,
    rot: rot,
    flip: flip,
    good: sprs == sprite.food.good,
    currTick: t,
  })
}
function eatFood(food) {
  sfx(3, 30 + (food.good ? 10 : 0) + Math.floor(Math.random() * 10) - 5)

  if (food.good) player.fn.addSpeed(foodVelMod)
  else player.fn.addSpeed(-foodVelMod)
  incScore()
}
function updateFood() {
  if (t % foodSpawnTime == 0 && foods.length <= foodSpawnMax) newFood()

  for (var i = 0; i < foods.length; i++) {
    const food = foods[i]
    //if food need to be deleted
    if (t - food.currTick >= foodDisapearTime) foods.splice(i, 1)
    //if player collects
    if (collides(food)) {
      eatFood(food)
      foods.splice(i, 1)
    }
  }
}
function drawFood() {
  for (var i = 0; i < foods.length; i++) {
    const food = foods[i]
    drawMap(
      food.sprite,
      food.pos.x,
      food.pos.y,
      //food.flip,
      //food.rot
      0,
      0
    )
  }
}

player.fn.update()
getMem()
// LOOP
function TIC() {
  cls(0)
  if (showingItems) {
    map(0, 34, 30, 17, 0, 0, 0, 1)
  } else {
    for (var i = 0; i < rooms[room].length; i++) {
      const r = rooms[room][i]
      map(r[0], r[1], 30, 17, 0, 0, 0, 1, r[2])
    }
  }
  updateDifficulty()
  if (gameStarted) {
    if (!paused) {
      updateRevolution()
      updateObstacles()
      updateFood()
      player.fn.update()
    }
    drawFood()
    drawObstacles()
    pauseLoop()
    slomoLoop()
    hudLoop()
  } else if (showingItems) {
    drawItems()
    player.fn.update()
  } else if (showingControls) {
    drawControls()
    player.fn.update()
  } else updateMenu()
  player.fn.draw()

  //increment the `tick` and `realTick`
  if (!paused)
    if (slomo) {
      t += 1 / slomoDiv
    } else {
      if (t | (0 != t)) t = Math.floor(t)
      t += 1
    }
  rt++
}

// <TILES>
// 001:00033300003390000004400000022000000230000002400000022000000ee000
// 002:000333000033900000044000000220000002340000022000000ee000000ff000
// 003:0000000000000000fffffffffefffffffeffffffffffffff0000000000000000
// 004:0000000000000000ffffffffffffffffffffffffffffffff0000000000000000
// 005:0000000000000000ffffffffffffffefffffffefffffffff0000000000000000
// 006:ccccccc0cfcfcfc0ccccccc0ceeeeec0cedddec0cedddec0ceeeeec0ccccccc0
// 007:0000000000dd20000dbbbd000dbbbd000debfd000d5f5d000de5ed0000ddd000
// 008:0000000004444444044bbb44044bbb44044bbb44044bbb440444444400000000
// 009:0000000044444440444444404444444044444440dd4444404444444000000000
// 010:0aaaaaa000989800008989000aaaaaa00aaaaaa00aaaaaa00aaaaaa000999900
// 011:00000000a999999aa999999aa444444aa444444a0a4444a00a4444a000aaaa00
// 012:000ddd00000d000000ddd0000222220002333200023332000233320002222200
// 013:0003000000030000000300000003000000030000000300000003000000030000
// 014:00000000000000000000000000ddd0000ddddd00dd030dd0d00300d000030000
// 015:0654321005634120ed87a9cbde789abccba987edbc9a78de0214365001234560
// 016:6666666666666666666666566666665666666666665666666665666666666666
// 017:00033300003340000004400000022000000230000002400000022000000ee000
// 018:00033300003390000004400000022400000230000002400000022000000ee000
// 019:0000000000000000333333333f3333333f333333333333330000000000000000
// 020:0000000000000000333333333333333333333333333333330000000000000000
// 021:000000000000000033333333333333f3333333f3333333330000000000000000
// 022:0000000000000000ccccccc0ccccccc0cfddddc0cfdabdc0cfddddc0cfedfdc0
// 023:000000000000000000000000baaaaaabb6aa33abb56aaaabb444999bbbbbbbbb
// 024:000000000000000000000000ee000000eeeeeeeeffeeeeeeff000000ff000000
// 025:000000000000000000000000000000eeeeeeeeeeeeeeeeff000000ff000000ff
// 026:00000000deeeeeeddeeeeeeddaaaaaaddaaaaaad0daaaad00daaaad000dddd00
// 027:ce000000cc000000cc000000cc000000ccddddddcccccccc0cccccc0000ccc00
// 028:dddddddddbbcbbbedbcbbbbedcbbcbbedbbcbbbedbcbbbbedbbbbbbeeeeeeeee
// 029:0003000000030000000300000003000000d0d0000d0d0d00d0d0d0d0d0d0d0d0
// 030:00030000000300000ddddd000ddddd000ddddd000ddddd0000ddd000000d0000
// 032:6666666646666666646646666666466666666666656666666566666656666566
// 033:4434444444444434444444444344444444444444434444444444444444444434
// 034:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd
// 035:0feddef00fdccdf000dccd0000dccd0000dccd000f4cc4f00feddef000000000
// 036:0002000000242000000200000006000000333300003333000033330000033000
// 037:000000000000000000000000abbbaa000abba0a00abbaa000a99a0000aaaa000
// 038:cfddddc0cfddddc0cfccccc0cfccccc0cfccccc0ccccccc0ccccccc0ccccccc0
// 039:0000030000000300000003000000030000000300033333000300030003000300
// 040:0eeeeee00dddddd00dd55dd00d5dd5d00d6dd5d00dd55dd00dddddd00dddddd0
// 041:00000000dddddddd0e000e000e000e000e000e000e000e00dddddddd00000000
// 042:00000000fddddddd0e000e000e000e000e000e000e000e00fddddddd00000000
// 043:0000000000000000000330000033330003333330333333333333333300022000
// 044:0000000000000000000000000000eeee000eeeee00eee43400ee004000ee0000
// 045:000000000000000000000000000000000ffffff00eeeeee00eeeeee00eeeeee0
// 046:0000000000e333330e4444440e3333330e4444440333333300f0000000f00000
// 047:0000000033333e00444444e0333333e0444444e03333333000000f0000000f00
// 048:6666666666666666666666666666666666666666666666666666666666666666
// 049:4444444444444444444444444444444444444444444444444444444444444444
// 050:dddddddddddddddddddddddddddddddddddddddddddedddddddddddddddddddd
// 051:00000000000eeeee0eeeeeeeddeeeeeedcdeeeeedcdfffffddffffff04000000
// 052:00000000eeeee000eeeeeee0eeeeeeddeeeeedcdfffffdcdffffffdd00000040
// 053:0000000000000000430000004300000043333333430000004300000000000000
// 054:0000000000000000000000000000000033333333000000000000000000000000
// 055:00000000ddd000040eee00443333333330000000300000003000000030000000
// 056:00000000444400b0444000b03333333300000003000000030000000300000003
// 057:0000100000001000000010000001110000011100000111000001110000111110
// 058:00000000000d0000000e000000df00000defd0000effed00dffffeddefffffee
// 059:0002200000022000000220000002200000022000000220000002200000333300
// 060:00ee000000ee000000ee000000ee000000ee000000ee000000ee000000ee0000
// 061:0ee55ee00e6ee5e00eeee5e00ee55ee00eeeeee00eeeeee00eeeeee00ffffff0
// 062:00000000000dd00000d00d0000d04d40044dd440044404000040044000440000
// 063:00000000000dd00000d00d0000d00d0000eeee0000eeee0000eeee0000000000
// 064:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
// 065:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaacccaaaacccccaaccccccaa
// 066:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
// 067:aaaaaaaaaaacccaaaccccccacccccccaccccccccaaaaaaaaaaaaaaaaaaaaaaaa
// 068:a333333a33444433344cc44334cccc4334cccc43344cc44333444433a333333a
// 069:aaaaaaaaaaaaaaccaaacccccaaccccccacccccccaaccccccaaaaaaaaaaaaaaaa
// 070:ccaaaaaaccccaaaacccccaaaccccccaaccccccaacccccaaaaaaaaaaaaaaaaaaa
// 071:00000000000000000000000077777777cccccccc333333333000000030000000
// 072:00000003000000030000222377722223ccccccc3333333330000000300000003
// 073:0011111000111110000030000000300000003000003030000300300000330000
// 074:00020200022220000023320000deed0000dddd00000dd000000dd000000dd000
// 075:0000000000000550505000505000550055050050505505050555050505544450
// 076:00ee000000ee000000ee000000ee000000ee000000ee00000ffff000ffffff00
// 077:00dddd000dddddd00dd00dd00dd00a000dd000000dd000000dd000000dd00000
// 078:ff2220fff222220f22444220244a442024aaa420033333003430343ff30003ff
// 079:03333330399999133bbbb9933555bb9336665bb3377665533f77666303333330
// 080:0000070000007000002222200223222202322222022222220022222000020200
// 081:0000050000044500004340000044000000430000004400000034400000034000
// 082:00000000067660006555566065dd555675dd5557655556700766600000000000
// 083:00000000000000005f22225062222f70052f2600007650000000000000000000
// 084:000000000000000000000000000000000deeedd00d333d000d333d0000ddd000
// 085:0000000000060000005550000555550006555500055556000555650000655000
// 086:0000000000665600065666606666656666666665056656600066660000000000
// 087:0000000000660600000660000022220002222220022222200222222000222200
// 088:0000000000cccc000cccccc00cc33cc00cc33cc00cccccc000cccc0000000000
// 089:0000000000060000006666000001600000101000000101000010100000010100
// 090:0505050000505500000550000033330000333300003333000033330000033000
// 091:0d444d40044d4440044444d0044444d004d44d4004444440004d440000444d00
// 092:0056600000111000001110000111110001111100011111000111110000111000
// 095:0000d0000000d0000000d0000000d00000022000000020000002200000022000
// 096:0000000000233230004444400042442000141440004444300065465000323320
// 097:00000000001220000021200000221000000d0000000d0000000d000000000000
// 098:0000000000000000000000003024203003444300302420300000000000000000
// 099:0000000000000000000340000004300000234200000210000001200000000000
// 100:0022200002222200222222202222222003333300003330000033300000030000
// 101:0000000000434300004444000034430001434400022122000012210000212100
// 102:0000000000333300003333000044440006666660002222000033330000000000
// 103:00030000000f0000000f000000fff00000ded00000ede00000fff00000fff000
// 104:0003000000020000000200000022200000efe00000fef0000022200000222000
// 105:0003000000010000000100000011100000fef00000efe0000011100000111000
// 106:0000000000000000000000000cccccc000cccc00001211000021220000cccc00
// 107:0000000034434430034343400343434002222220022222200222222000222200
// 112:9999999999999999999999999999999999999999999999999999999999999999
// 113:999999999999999999999999999999999999999999ddd9999ddddd99dddddd99
// 114:99999999999999999999999999999c9999999999999999999999999999999999
// 115:99999999999ddd999dddddd9ddddddd9dddddddd999999999999999999999999
// 116:999ccc9999ccc9999ccc99999ccc99999ccc99999ccc999999ccc999999ccc99
// 117:99999999999999dd999ddddd99dddddd9ddddddd99dddddd9999999999999999
// 118:dd999999dddd9999ddddd999dddddd99dddddd99ddddd9999999999999999999
// 128:7777777777777777777777677777776777777777776777777776777777777777
// 140:eeeeeeeee99d999fe9d9999fed99d99fe99d999fe9d9999fe999999fffffffff
// 143:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeddedddddeedeeededeeedeee
// 144:7777777737777777737737777777377777777777767777777677777767777677
// 145:3323333333333323333333333233333333333333323333333333333333333323
// 146:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
// 159:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeddddddddededededdddddddddededede
// 160:7777777777777777777777777777777777777777777777777777777777777777
// 161:3333333333333333333333333333333333333333333333333333333333333333
// 162:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeefeeeeeeeeeeeeeeeeeeee
// 176:44444444444444444bbbbbb44bbbbbb44bbbbbb44bbbbbb44444444444444444
// 179:ececececcecececeececececcecececeececececcecececeececececcececece
// 180:eecceecceecceecccceecceecceecceeeecceecceecceecccceecceecceeccee
// 192:444444d4444444d4444444444444444444444444444444444444444444444444
// 193:4d4444444d444444444444444444444444444444444444444444444444444444
// 195:6c6c6c6cc6c6c6c66c6c6c6cc6c6c6c66c6c6c6cc6c6c6c66c6c6c6cc6c6c6c6
// 196:acacacaccacacacaacacacaccacacacaacacacaccacacacaacacacaccacacaca
// 208:6c6c6c6cc6c6c6c66c6c6c6cc6c6c6c66c6c6c6cc6c6c6c66c6c6c6cc6c6c6c6
// 209:acacacaccacacacaacacacaccacacacaacacacaccacacacaacacacaccacacaca
// 210:ffffffffffffffffffffffffffffffffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
// 231:000ccc0000cca00000c4400000088000000880000008400000088000000cc000
// 232:00099900009390000094400000066000000664000006600000044000000ff000
// 236:0011110001144110014444100434434004444440044444400442244000444400
// 237:0011110001144110014444100434434004444440044cc4400044440000000000
// 238:00033300003390000004400000022000000230000002400000022000000ee000
// 239:000333000033900000044000000220000002340000022000000ee000000ff000
// 247:000fff0000ff20000004400000033400000330000003400000033000000ee000
// 252:0011110001144110014444100444444004444440044444400442244000444400
// 253:001111000114411001444410043443400444444004444440044cc44000444400
// 254:00033300003340000004400000022000000230000002400000022000000ee000
// 255:00033300003390000004400000022400000230000002400000022000000ee000
// </TILES>

// <MAP>
// 000:04040404040422c1c122c1c1220404042223222222c1c122040424040404000000000000000000000000000000000000000000000000000000000000292929292929292a2929292a2a2929292929292929292a29292a2929292a292929292929292a2929292a2a2929292929292929292a29292a2929292a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 001:24442404240422c1c122c1c12234040422c1c1222222222224040454640400000000000030405060708090a0b0c0d0d0e0e2f200000000000000000029292a292929292929292929292929292a2929292929292929292a29292929292a292929292929292929292929292a2929292929292929292a292929000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 002:0404043404042322222322222204040422c1c12223c1c12304040424040430404050000031415161718191a1b1c1d1e1d0f0000000000000000000002a292929292929292a292929292a29292a292929292929292929292929292a2929292929292929292929292a29292a29292929292929292929292929000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 003:24040404042422c1c122c1c1220404542222222222c1c122546404041404304040405068324252627282b2929292a2929200000000000000000000002929292a29292929292929292929292929292929292a29292929292a29292929292a29292929292929292929292929292929292a29292929292a2929000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 004:04140404041422c1c122c1c12264041422c1c12222222222040404040404304040404050334353637383b393a3c2d2f5000000000000000000000000292929c1c1c1c12929292a292ac1c1c1c1292a2929292929c1c1c1c1292929292929292a292929292a292a2929292929292929292929292929292929000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 005:0404546404042222222222222204040422c1c12322c1c12204043404040430404040404050967484a6000094a4c3d3e3f30000000000000000000000292929c1c1c1c1292a29292929c1c1c1c1292a292929292ac1c1c1c12a2929292929292929292a292929c1c1c1c1c12a29292929c1c1c1c1c1292a29000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 006:04040404040423c1c122c1c1220424042222222222c1c122040404042404304040404040405000000000000000c4d4e4f40000000000000000000000292929c1c1c1c1292929292a29c1c1c1c1292a292a292a29c1c1c1c12929292929292929292929292929c1c1c1c1c12929292a29c1c1c1c1c12a2929000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 007:04240404040422c1c122c1c12204040422c1c122222222220404042424043040404040404040500000000000000000e50000000000000000000000002a2929c1c1c1c1292929292a29c1c1c1c129292929292929c1c1c1c12a292a2929292929292a29292929c1c1c1c1c12929292a29c1c1c1c1c1292a29000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 008:0424040424042322220b22232204240422c1c122220b0b222404040404043040404040404040405000000000000000000000000000000000000000002929292a292929292a29292929292929292a29290b2a2929292a292929292929292a29290b0b2a29292929292929292a2929292a2929292a29292929000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 009:0404040404042223220c22222204040423222223220c1c22040404040404000000000000000000000000000000000000000000000000000000000000f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f80cf8f8f8f8f8f8f8f8f8f8f8f8f8f8f80c1cf8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 010:010303010303030303010303030303030303010303030303030303030303000000000000000000000000000000000000000000000000000000000000232223222322222322222223222222222222222223222222222222222222232223222322222322222223222222222222222223222222222222222222000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 011:121313030302030103030203010303030203030301030312131312030302f000000000000000000000b4000000000000000000000000000000000000222222222222222222232222222222232222222222232222222222222222222222222222222222232222222222232222222222232222222222222222000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 012:13131313030203030103030302030303010203030302131313121313030305152535455565758595a5b5c50000000000000000000000000000000000232222222222222222222222232222222223222222222222222222232222232222222222222222222222232222222223222222222222222222232222000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 013:13121213030303030203030301030303030303030303131312131303020306162636465666768696a6b6c60000000000000000000000000000000000222222222223222222222222222222232222222222222222222322222222222222222223222222222222222222232222222222222222222322222222000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 014:131213130302030303030303030303020303030103030313131301030103000000000000000000000000000000000000000000000000000000000000222322222222222222222322222222222222222322232222222222222222222322222222222222222322222222222222222322232222222222222222000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 015:121313030301030303030302030303020303030303030102030303030302000000000000000000000000000000000000000000000000000000000000222322222223222222222222222223222222222222222222222222232222222322222223222222222222222223222222222222222222222222232222000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 016:030303030303030301030303030303030303030303030303030301030103000000000000000000000000000000000000000000000000000000000000222222222222222222222222222222222222222222222222222222222322222222222222222222222222222222222222222222222222222222222322000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 023:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 024:000000c2000000000000000000c200000000000000000000c2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e300000000000000000000000000000000e30000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 025:000000c3d20000000000000000c300000000000000000000c300d200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 026:e2f200c4d30000000000000000c4e2f20000000000000000c400d300e2f2000000000000000000000000000000000000000000000000000000000000f8000000000000000000000000000000000000000000000000000000b300f80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 031:000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 032:000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000053630000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 033:000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000536300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 034:1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 035:1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 036:1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 037:1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 038:1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 039:1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 040:1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 041:1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 042:1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 043:1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 044:0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 045:0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 046:0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 047:0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 048:0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 049:0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 050:0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// </MAP>

// <WAVES>
// 000:00000000ffffffff00000000ffffffff
// 001:0123456789abcdeffedcba9876543210
// 002:0123456789abcdef0123456789abcdef
// </WAVES>

// <SFX>
// 000:0002001f101f102ff02ff02ff030f055f040f030f0a5f020e020e0b0f090f0c4e043e0b3e012e03ff001f0a0f0a0f027f097f011f011f016f017f01150b000000000
// 001:010001000100010001000100010001000100010031009100f100f100f100f100f100f100f100f100f100f100f100f100f100f100f100f100f100f100008000000000
// 002:0027001500140013001200010000000f000e000e300d300c500b700a9009a008b008c000e000f000f000f000f000e000f000f000f000f000f000f001007000000000
// 003:0060006000600060006000600060006060b060b060b060b000f000f000f000f000f000f000f000f000f000f000f000f0f000f000f000f000f000f00033a000000000
// 004:0060006000600060006000600060006060b060b060b060b000f000f000f000f000f000f000f000f000f000f000f000f0f000f000f000f000f000f000377000000000
// 005:0060006000600060006000600060006060b060b060b060b000f000f000f000f000f000f000f000f000f000f000f000f0f000f000f000f000f000f000400000000000
// 006:0010002000200020004000500050006000700070009000a000b000c000c000d000e000f000f0005000700080009000a000c000c000d000e000f000f0104000000000
// 051:000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000
// </SFX>

// <PATTERNS>
// 000:d00018000010d00018000000d00018000000100010000010500018000010500018000010500018100010100010100010d00018100010000000f00018000000000000d00018000000000000000000c00018e00018000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// </PATTERNS>

// <TRACKS>
// 000:100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ce0000
// </TRACKS>

// <PALETTE>
// 000:1a1c2c5d275db13e53ef7d57ffcd75a7f07038b76425717929366f3b5dc941a6f673eff7f4f4f494b0c2566c86333c57
// </PALETTE>
