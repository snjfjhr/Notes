const BUTTONS_TOP = 400; // 各レーンのボタン上部のY座標
const BUTTONS_HEIGHT = 50; // 各レーンのボタンの高さ
 
const LANE_WIDTH = 70; // レーンの幅
const LANE_LEFTS = [10, 100, 190, 280]; // 各レーンの左側のX座標
const BLOCK_HEIGHT = 50; // 落ちてくるブロックの当たり判定のある部分の高さ
 
// 落ちてくるブロックの当たり判定のある部分のY座標の最小値と最大値
const HIT_Y_MIN = BUTTONS_TOP - BLOCK_HEIGHT;
const HIT_Y_MAX = BUTTONS_TOP + BUTTONS_HEIGHT;
 
// canvasの幅と高さ
const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 540;
 
// 開始ボタンと各レーン（0番～3番）のボタンの要素
const $start = document.getElementById('start');
const $zero = document.getElementById('zero');
const $one = document.getElementById('one');
const $two = document.getElementById('two');
const $three = document.getElementById('three');
 
// canvas要素とコンテキスト
const $canvas = document.getElementById('canvas');
const ctx = $canvas.getContext('2d');
 
// 効果音とBGM
const okSound = new Audio('Taiko1Note.wav');
const missSound = new Audio('Taiko1Note.wav');
const bgm = new Audio('Michiyuki_NoTaiko.wav');
 
const drumrollSound1 = new Audio('./drumroll1.mp3');
const drumrollSound2 = new Audio('./drumroll2.mp3');
 
// 落ちてくるブロックの配列
let blocks = [];
 
// ヒット、ミス、見逃しの文字を表示するレーンの配列
const hitLaneNumbers = [];
const missLaneNumbers = [];
const throughLaneNumbers = [];
 
let isPlaying = false; // 現在プレイ中か？
let speed = 3.0; // 落下速度
let hitCount = 0; // 成功数
let missCount = 0; // ミス数
let throughCount = 0; // 見逃し数

function clearCanvas(){
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, $canvas.width, $canvas.height);
}

function drawLanes(){
    ctx.strokeStyle = '#ccc';
    for(let i =0; i < LANE_LEFTS.length; i++)
        ctx.strokeRect(LANE_LEFTS[i], 0, LANE_WIDTH, $canvas.height);
}

function drawHit(laneNum){
    ctx.fillStyle = '#0ff';
    ctx.font = '20px bold ＭＳ ゴシック';
    const textWidth = ctx.measureText('Hit').width;
    ctx.fillText('HIT', LANE_LEFTS[laneNum] + (LANE_WIDTH - textWidth) / 2, HIT_Y_MAX + 10);
}

function drawThrough(laneNum){
    ctx.fillStyle = '#ff0';
    ctx.font = '20px bold ＭＳ ゴシック';
    const textWidth = ctx.measureText('Miss').width;
    ctx.fillText('Miss', LANE_LEFTS[laneNum] + (LANE_WIDTH - textWidth) / 2, HIT_Y_MAX + 30);
}

function drawMiss(laneNum){
    ctx.fillStyle = '#f0f';
    ctx.font = '20px bold ＭＳ ゴシック';
    const textWidth = ctx.measureText('Miss').width;
    ctx.fillText('Miss', LANE_LEFTS[laneNum] + (LANE_WIDTH - textWidth) / 2, HIT_Y_MAX + 50);
}

function onHit(laneNum){
    hitCount++;
    okSound.currentTime = 0;
    okSound.play();
 
    hitLaneNumbers.push(laneNum);
    setTimeout(() => {
        hitLaneNumbers.shift();
    }, 500);
}

function onMiss(laneNum){
    missCount++;
    missSound.currentTime = 0;
    missSound.play();
 
    missLaneNumbers.push(laneNum);
    setTimeout(() => {
        missLaneNumbers.shift();
    }, 500);
}

function onThrough(laneNum){
    throughCount++;
 
    throughLaneNumbers.push(laneNum);
    setTimeout(() => {
        throughLaneNumbers.shift();
    }, 500);
}

class Block{
    constructor(laneNum, delay){
        this.LaneNumber = laneNum;
        this.X = LANE_LEFTS[laneNum];
        this.Y = - 90 * delay;
        this.Width = LANE_WIDTH;
        this.Height = BLOCK_HEIGHT;
 
        // ヒットと見逃しを二重に評価しないためのフラグ
        this.IsHit = false;
        this.IsThrough = false;
    }
 
    Update(){
        // ヒットされていないのにHIT_Y_MAXより下に落ちてきたら見逃しと判断する
        if(!this.IsHit && !this.IsThrough && this.Y > HIT_Y_MAX){
            this.IsThrough = true;
            onThrough(this.LaneNumber);
        }
        this.Y += speed;
    }
 
    Draw(){
        ctx.fillStyle = '#f00';
        ctx.fillRect(this.X, this.Y + 20, this.Width, this.Height - 40);
        //ctx.fillRect(this.X, this.Y, this.Width, this.Height);でもよいがブロックが厚くなりすぎるので・・・
    }
}

window.onload = () => {
    $canvas.width = CANVAS_WIDTH;
    $canvas.height = CANVAS_HEIGHT;
 
    clearCanvas();
    drawLanes();
 
    $start.addEventListener('click', (ev) => {
        ev.preventDefault();
        gameStart();
    });
 
    setPositionButtons(); // 後述
    addEventListeners(); // 後述
}

function setPositionButtons(){
    const buttons = [$zero, $one, $two, $three];
    for(let i = 0; i < buttons.length; i++){
        buttons[i].style.left = LANE_LEFTS[i] + 'px';
        buttons[i].style.top = BUTTONS_TOP + 'px';
        buttons[i].style.width = LANE_WIDTH + 'px';
        buttons[i].style.height = BUTTONS_HEIGHT + 'px';
    }
}

function addEventListeners(){
    $start.addEventListener('click', (ev) => {
        ev.preventDefault();
        gameStart();
    });
 
    // PCスマホ両方に対応させる（clickイベントだと反応が遅くなるので'mousedown', 'touchstart'を使う）
    const buttons = [$zero, $one, $two, $three];
    const events = ['mousedown', 'touchstart'];
 
    for(let i = 0; i < LANE_LEFTS.length; i++){
        for(let k = 0; k < events.length; k++){
            buttons[i].addEventListener(events[k], (ev) => {
                ev.preventDefault();
 
                if(!isPlaying)
                    return;
 
                // タップしたときにそのレーンにヒットの対象になるブロックは存在するか調べる。
                const hits = blocks.filter(rect => !rect.IsHit && rect.X == LANE_LEFTS[i] && HIT_Y_MIN < rect.Y && rect.Y < HIT_Y_MAX);
                if(hits.length > 0){
                    hits[0].IsHit = true; // 二重に評価しないためのフラグをセット
                    onHit(i);
                }
                else
                    onMiss(i);
            });
        }
    }
}

setInterval(() => {
    if(!isPlaying)
        return;
 
    clearCanvas();
    drawLanes();
 
    blocks.forEach(block => block.Update());
    blocks.forEach(block => block.Draw());
 
    hitLaneNumbers.forEach(num => drawHit(num));
    throughLaneNumbers.forEach(num => drawThrough(num));
    missLaneNumbers.forEach(num => drawMiss(num));
 
    // canvas上部にスコアを表示
    ctx.font = '20px bold ＭＳ ゴシック';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Hit  ${hitCount}    Through  ${throughCount}    Miss  ${missCount}`, 10, 10);
}, 1000 / 60);

function gameStart(){
    blocks.length = 0;
    
    // 上から落ちてくるブロックをランダムに生成する
    let i=0
    let n0=12
    while(i < n0+64){
      d=i-n0
      if(d%32==0 || d%32==2 || d%32==6 || d%32==16 || d%32==18 || d%32==22){
        blocks.push(new Block(1, i));
      }
      if(d%32==3 || d%32==17 || d%32==19){
        blocks.push(new Block(0, i));
      }
      i+=1
    }
 
    // スコアをリセット
    hitCount = 0;
    missCount = 0;
    throughCount = 0;
 
    speed = 3.0;
    isPlaying = true;
 
    // BGMを鳴らす
    bgm.currentTime = 0;
    bgm.play();
 
    // 開始ボタンを非表示に
    $start.style.display = 'none';
 
    // BGMの終了近くになったら以降は新しいブロックを落とさないようにする
    // blocksからY座標が-10以下のものと取り除く（ついでに必要ないCANVAS_HEIGHT以上のものの取り除く）
    setTimeout(() => {
        blocks = blocks.filter(rect => rect.Y > -10 && rect.Y < CANVAS_HEIGHT);
    }, 1000 * 100);
 
    // BGMが終了したタイミングで更新処理を停止してドラムロールを鳴らして結果を表示する
    setTimeout(async() => {
        isPlaying = false;
 
        bgm.pause();
        await playDrumroll(); // 後述
 
        const resultText = `Hit: ${hitCount}\n見逃し: ${throughCount}\nMiss: ${missCount}`;
        showResult(resultText); // 後述
    }, 1000 * 103);
}

async function playDrumroll(){
    drumrollSound1.currentTime = 0;
    drumrollSound1.play();
 
    return new Promise((resolve) => {
        setTimeout(() => {
            drumrollSound1.pause();
            setTimeout(() => {
                drumrollSound2.currentTime = 0;
                drumrollSound2.play();
                resolve();
            }, 300);
        }, 2500);
    });
}

function showResult(resultText){
    const arr = resultText.split('\n');
    if(arr.length < 3)
        return;
 
    ctx.fillStyle = '#ff0';
    ctx.font = '20px bold ＭＳ ゴシック';
 
    const textWidth1 = ctx.measureText('結果').width;
    const x1 =  (CANVAS_WIDTH - textWidth1) / 2;
    ctx.fillStyle = '#fff';
    ctx.fillText('結果', x1, 160);
 
    const textWidth = ctx.measureText(arr[1]).width;
    const x =  (CANVAS_WIDTH - textWidth) / 2;
    ctx.fillStyle = '#0ff';
    ctx.fillText(arr[0], x, 200);
    ctx.fillStyle = '#ff0';
    ctx.fillText(arr[1], x, 230);
    ctx.fillStyle = '#f0f';
    ctx.fillText(arr[2], x, 260);
 
    $start.style.display = 'block';
}
