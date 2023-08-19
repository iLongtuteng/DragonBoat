import { _decorator, Animation, Button, EventKeyboard, Input, input, instantiate, KeyCode, Label, Node, Prefab, ScrollView, UIOpacity, UITransform, Vec3 } from 'cc';
import { CameraCtrl } from './CameraCtrl';
import { World } from './World';
import FWKComponent from '../../fwk/FWKComponent';
import { FWKMsg } from '../../fwk/mvc/FWKMvc';
import { gameManager } from '../GameManager';
import { audioManager } from '../AudioManager';
import { GameSystemState, ResultType } from '../../shared/game/GameSystem';
import { Battery } from '../prefabs/Battery';
import { Confirm } from '../prefabs/Confirm';
import { Team } from '../prefabs/Team';
import { Boat } from '../prefabs/Boat';
import { Warn } from '../prefabs/Warn';
const { ccclass, property } = _decorator;

@ccclass('Game')
export class Game extends FWKComponent {

    @property(Prefab)
    confirmPrefab: Prefab;

    @property(Node)
    camera: Node;

    @property(Node)
    world: Node;

    @property(Prefab)
    boatPrefab: Prefab;

    @property(Prefab)
    rankPrefab: Prefab;

    @property(Node)
    ranks: Node;

    @property(ScrollView)
    batteryView: ScrollView;

    @property(Prefab)
    batteryPrefab: Prefab;

    @property(Node)
    batteries: Node;

    @property(Prefab)
    teamPrefab: Prefab;

    @property(Node)
    teams: Node;

    @property(Node)
    loading: Node;

    @property(Node)
    result: Node;

    @property(Label)
    timeLbl: Label;

    @property(Button)
    endBtn: Button;

    @property(Prefab)
    warnPrefab: Prefab;

    private _teamArr: number[] = []; // 加入竞赛的全部团队索引
    private _teamIdx: number = -1; // 本人所属的团队索引
    private _choosenIdx: number = -1;
    private _memberArr: number[] = []; // 本人所属的团队成员playerId
    private _boatMap: Map<number, Node> = new Map<number, Node>();
    private _selfBoat: Node = null;
    private _rankMap: Map<number, Node> = new Map<number, Node>();
    private _rankArr: any[] = [];
    private _teamNodeMap: Map<number, Node> = new Map<number, Node>();
    private _batteryMap: Map<number, Node> = new Map<number, Node>();
    private _heartState: number = 0;
    private _isLeader: boolean = false;
    private _trainingTime: number = 0;
    private _connCount: number = 0;

    async onLoad() {
        window.addEventListener('message', this._onMessage.bind(this));
        input.on(Input.EventType.KEY_UP, this._onKeyUp, this);
        this._startTimer();

        gameManager.postDisconnect(() => {
            let warn = instantiate(this.warnPrefab);
            warn.parent = this.node;
            warn.getComponent(Warn).label.string = '断线重连';
            console.log('意外断线, 100毫秒后重连');
            setTimeout(async () => {
                await gameManager.connect();

                gameManager.joinRace(gameManager.isAdviser, gameManager.selfPlayerId, undefined, undefined, () => { }, (err) => {
                    let warn = instantiate(this.warnPrefab);
                    warn.parent = this.node;
                    warn.getComponent(Warn).label.string = err;
                });

                // let res = await gameManager.connect();
                // 重连也错误，弹出错误提示
                // if(!res.isSucc){
                //     alert('网络错误，连接已断开');
                // }
            }, 100);
        });

        if (gameManager.isAdviser) {
            this.endBtn.node.active = true;
        } else {
            this.endBtn.node.active = false;
            this.loading.active = true;
            this.scheduleOnce(() => {
                this.loading.active = false;
            }, gameManager.delayTime / 1000);
        }

        for (let entry of gameManager.teamMap.entries()) {
            this._teamArr.push(entry[0]);
            let index = entry[1].indexOf(gameManager.selfPlayerId);
            if (index >= 0) {
                this._teamIdx = entry[0];
                this._memberArr = entry[1];
                if (this._memberArr[0] == gameManager.selfPlayerId) {
                    this._isLeader = true;
                }
            }
        }

        let temp = null;
        for (let i = 0; i < this._teamArr.length - 1; i++) {
            for (let j = 0; j < this._teamArr.length - i - 1; j++) {
                if (this._teamArr[j] > this._teamArr[j + 1]) {
                    temp = this._teamArr[j];
                    this._teamArr[j] = this._teamArr[j + 1];
                    this._teamArr[j + 1] = temp;
                }
            }
        }

        this.world.getComponent(World).addFlow(() => {
            for (let i = 0; i < this._teamArr.length; i++) {
                const element = this._teamArr[i];
                let boat = instantiate(this.boatPrefab);
                this.world.getComponent(World).addBoat(boat, i, element);

                let rank = instantiate(this.rankPrefab);
                rank.parent = this.ranks;

                if (gameManager.isAdviser) {
                    boat.getChildByName('FloatAnim').getChildByName('RowAnim').getComponent(Animation).play('RowGreen');
                } else {
                    if (element == this._teamIdx) {
                        boat.getChildByName('FloatAnim').getChildByName('RowAnim').getComponent(Animation).play('RowRed');
                        this._selfBoat = boat;

                        this.camera.getComponent(CameraCtrl).boat = boat;
                        this.world.getComponent(World).setBoat(boat);
                    } else {
                        boat.getChildByName('FloatAnim').getChildByName('RowAnim').getComponent(Animation).play('RowGreen');
                    }
                }

                this._boatMap.set(element, boat);
                this._rankMap.set(element, rank);

                if (gameManager.isAdviser) {
                    let team = instantiate(this.teamPrefab);
                    team.parent = this.teams;
                    team.position = new Vec3(0, (this._teamArr.length - 1 - i) * 90, 0);
                    team.getComponent(Team).init(element);

                    this._teamNodeMap.set(element, team);
                }
            }

            if (gameManager.isAdviser && this._teamNodeMap.has(this._teamArr[0])) {
                this.scheduleOnce(() => {
                    this._teamNodeMap.get(this._teamArr[0]).getComponent(Team).onTeamBtn();
                }, 0.2);
            }
        });

        if (!gameManager.isAdviser) {
            let batteryArr: number[] = [];
            batteryArr[0] = gameManager.selfPlayerId;
            for (let playerId of this._memberArr) {
                if (playerId != gameManager.selfPlayerId) {
                    batteryArr.push(playerId);
                }
            }

            // for (let i = 0; i < 20; i++) {
            //     batteryArr.push(i);
            // }

            for (let i = 0; i < batteryArr.length; i++) {
                const element = batteryArr[i];
                let battery = instantiate(this.batteryPrefab);
                battery.parent = this.batteries;
                battery.getComponent(Battery).label.string = gameManager.nameMap.get(element);
                // battery.getComponent(Battery).label.string = '张三三';

                let posY = (batteryArr.length - 1 - i) * 40;

                if (i == 0) {
                    battery.position = new Vec3(0, posY, 0);
                    battery.scale = new Vec3(0.8, 0.8, 1);
                    if (posY + 44 >= 560) {
                        this.batteries.getComponent(UITransform).height = posY + 44;
                    }
                } else {
                    battery.position = new Vec3(44, posY, 0);
                    battery.scale = new Vec3(0.6, 0.6, 1);
                }

                this._batteryMap.set(element, battery);
            }

            this.batteryView.scrollToTop();
            // console.log('height: ' + this.batteries.getComponent(UITransform).height);
            // console.log('position: ' + this.batteries.position);
        }

        // this._refreshBattery(0);

        this._heartState = 0;
        gameManager.sendClientInput({
            type: 'PlayerHeart',
            heartState: this._heartState
        });

        audioManager.playMusic();

        if (gameManager.isAdviser) {
            gameManager.enterRace();
        }
    }

    onDestroy() {
        window.removeEventListener('message', this._onMessage.bind(this));
        input.off(Input.EventType.KEY_UP, this._onKeyUp, this);
    }

    private _onMessage(e: MessageEvent): void {
        let obj = JSON.parse(e.data);

        if (gameManager.isAdviser) {
            if (obj.type == 'stop') {
                console.log('obj.type == "stop"');
                gameManager.endRace();
            }
        } else {
            if (obj.type == 'state') {
                console.log('obj.type == "state"');
                if (obj.S != null) {
                    console.log('obj.S: ' + obj.S);
                    this._heartState = parseInt(obj.S);
                }
            }

            if (obj.type == 'error') {
                console.log('obj.type == "error"');
                this._heartState = 0;
            }

            gameManager.sendClientInput({
                type: 'PlayerHeart',
                heartState: this._heartState
            });
        }
    }

    private _onKeyUp(event: EventKeyboard): void {
        switch (event.keyCode) {
            case KeyCode.ARROW_LEFT:
                this._heartState = 0;
                break;

            case KeyCode.ARROW_UP:
                this._heartState = 1;
                break;

            case KeyCode.ARROW_RIGHT:
                this._heartState = 2;
                break;
        }

        gameManager.sendClientInput({
            type: 'PlayerHeart',
            heartState: this._heartState
        });
    }

    private _startTimer() {
        this._timerCallback();
        this.schedule(this._timerCallback, 1);
    }

    private _endTimer() {
        this.unschedule(this._timerCallback);
    }

    private _timerCallback() {
        this._trainingTime++;
        this.timeLbl.string = this._getTimeStr(this._trainingTime);

        if (this._trainingTime >= 600 && gameManager.isAdviser) {
            gameManager.endRace();
        }

        this._connCount++;
        if (this._connCount >= 3) {
            console.log('连接已断开');
        }
    }

    private _getTimeStr(time: number): string {
        let h = Math.floor(time / 60 / 60); // % 24
        let hStr = h < 10 ? '0' + h : '' + h;
        let m = Math.floor(time / 60 % 60);
        let mStr = m < 10 ? '0' + m : '' + m;
        let s = time % 60;
        let sStr = s < 10 ? '0' + s : '' + s;

        return hStr + ':' + mStr + ':' + sStr;
    }

    public onMsg_TeamBtnClicked(msg: FWKMsg<number>): boolean {
        let key: number = msg.data;
        for (let value of this._teamNodeMap.values()) {
            value.getComponent(Team).teamBtn.getComponent(Button).normalSprite = gameManager.greenSprite;
            value.getComponent(Team).teamBtn.getComponent(Button).hoverSprite = gameManager.greenSprite;
        }
        this._teamNodeMap.get(key).getComponent(Team).teamBtn.getComponent(Button).normalSprite = gameManager.blueSprite;
        this._teamNodeMap.get(key).getComponent(Team).teamBtn.getComponent(Button).hoverSprite = gameManager.blueSprite;

        this.camera.getComponent(CameraCtrl).boat = this._boatMap.get(key);
        this.world.getComponent(World).setBoat(this._boatMap.get(key));

        this._choosenIdx = key;
        this._refreshBattery(key);

        return true;
    }

    private _refreshBattery(key: number): void {
        this.batteries.getComponent(UITransform).height = 559;
        this.batteries.removeAllChildren();
        this._batteryMap.clear();

        // let batteryArr: number[] = [];
        // for (let i = 0; i < 20; i++) {
        //     batteryArr.push(i);
        // }

        // for (let i = 0; i < batteryArr.length; i++) {
        //     const element = batteryArr[i];
        for (let i = 0; i < gameManager.teamMap.get(key).length; i++) {
            const element = gameManager.teamMap.get(key)[i];
            let battery = instantiate(this.batteryPrefab);
            battery.parent = this.batteries;
            battery.getComponent(Battery).label.string = gameManager.nameMap.get(element);
            // battery.getComponent(Battery).label.string = '张三三';

            let posY = (gameManager.teamMap.get(key).length - 1 - i) * 40;
            // let posY = (batteryArr.length - 1 - i) * 40;

            if (i == 0 && posY + 34 >= 560) {
                this.batteries.getComponent(UITransform).height = posY + 34;
            }
            battery.position = new Vec3(44, posY, 0);
            battery.scale = new Vec3(0.6, 0.6, 1);
            this._batteryMap.set(element, battery);
        }

        this.batteryView.scrollToTop();
    }

    public onMsg_ApplySystemState(msg: FWKMsg<GameSystemState>): boolean {
        this._connCount = 0;

        let systemState: GameSystemState = msg.data;
        this._rankArr = [];

        for (let entry of this._boatMap.entries()) {
            let boat = systemState.balls.find(v => v.idx === entry[0]);
            if (!boat) {
                entry[1].removeFromParent();
                this._boatMap.delete(entry[0]);
                this._rankMap.get(entry[0]).removeFromParent();
                this._rankMap.delete(entry[0]);
                if (gameManager.isAdviser && this._teamNodeMap.has(entry[0])) {
                    this._teamNodeMap.get(entry[0]).getComponent(Team).teamBtn.interactable = false;
                }
            } else {
                // console.log('boat.idx: ' + boat.idx);
                // console.log('boat.maxSpeed: ' + boat.maxSpeed);
                //应用每条龙舟的速度
                if (boat.isConn) {
                    entry[1].getComponent(Boat).setState(boat.maxSpeed);
                } else {
                    entry[1].getComponent(Boat).setState(0);
                    if (gameManager.isAdviser && this._teamNodeMap.has(entry[0])) {
                        this._teamNodeMap.get(entry[0]).getComponent(Team).teamBtn.interactable = false;
                    }
                }

                if (gameManager.isAdviser) {
                    if (boat.isConn && entry[1] && boat.pos.x != 0 && boat.pos.y != 0) {
                        entry[1].position = new Vec3(boat.pos.x, boat.pos.y, 0);
                    }

                    if (boat.idx == this._choosenIdx) {
                        //应用团队成员的心脏状态
                        for (let entry of this._batteryMap.entries()) {
                            let player = boat.players.find(v => v.id === entry[0]);
                            if (!player) {
                                entry[1].getComponent(Battery).setState(0);
                                entry[1].getComponent(UIOpacity).opacity = 128;
                            } else {
                                entry[1].getComponent(Battery).setState(player.heartState);
                            }
                        }
                    }
                } else {
                    if (boat.idx == this._teamIdx) { //如果是自己的团队
                        if (this._isLeader) { //如果自己是队长，则发送位置
                            gameManager.sendClientInput({
                                type: 'BallMove',
                                pos: {
                                    x: this._selfBoat.position.x,
                                    y: this._selfBoat.position.y,
                                }
                            });
                        } else { //如果自己不是队长，则更新该龙舟位置
                            if (boat.isConn && entry[1] && boat.pos.x != 0 && boat.pos.y != 0) {
                                entry[1].position = new Vec3(boat.pos.x, boat.pos.y, 0);
                            }
                        }

                        //应用团队成员的心脏状态
                        for (let entry of this._batteryMap.entries()) {
                            let player = boat.players.find(v => v.id === entry[0]);
                            if (!player) {
                                entry[1].getComponent(Battery).setState(0);
                                entry[1].getComponent(UIOpacity).opacity = 128;
                            } else {
                                entry[1].getComponent(Battery).setState(player.heartState);
                            }
                        }

                        if (this._isLeader && boat.result == ResultType.Win) {
                            gameManager.endRace(this._teamIdx);
                        }
                    } else { //如果不是自己的团队
                        //更新该龙舟位置
                        if (boat.isConn && entry[1] && boat.pos.x != 0 && boat.pos.y != 0) {
                            entry[1].position = new Vec3(boat.pos.x, boat.pos.y, 0);
                        }
                    }
                }

                this._rankArr.push({
                    idx: boat.idx,
                    dis: boat.pos.x
                });
            }
        }

        let temp = null;
        for (let i = 0; i < this._rankArr.length - 1; i++) {
            for (let j = 0; j < this._rankArr.length - i - 1; j++) {
                if (this._rankArr[j].dis < this._rankArr[j + 1].dis) {
                    temp = this._rankArr[j];
                    this._rankArr[j] = this._rankArr[j + 1];
                    this._rankArr[j + 1] = temp;
                }
            }
        }

        for (let i = 0; i < this._rankArr.length; i++) {
            let fix = '';
            switch (i) {
                case 0:
                    fix = 'st';
                    break;

                case 1:
                    fix = 'nd';
                    break;

                case 2:
                    fix = 'rd';
                    break;

                default:
                    fix = 'th';
                    break;
            }

            if (this._rankMap.has(this._rankArr[i].idx)) {
                this._rankMap.get(this._rankArr[i].idx).getChildByName('Label').getComponent(Label).string = (i + 1).toString() + fix;
            }
        }

        return true;
    }

    public onMsg_RaceShowResult(msg: FWKMsg<number>): boolean {
        // gameManager.disconnect();
        for (let value of this._boatMap.values()) {
            value.getComponent(Boat).setState(0);
        }
        audioManager.stopMusic();
        this.result.active = true;

        let winnerIdx: number = msg.data;
        if (winnerIdx != undefined && winnerIdx != null) {
            if (gameManager.isAdviser) {
                this.result.getChildByName('Label').getComponent(Label).string = (winnerIdx + 1) + '队赢了！';
            } else {
                if (this._teamIdx == winnerIdx) {
                    this.result.getChildByName('Label').getComponent(Label).string = '你们队赢了！';
                    audioManager.playSound('Win');
                } else {
                    this.result.getChildByName('Label').getComponent(Label).string = '你们队输了！';
                    audioManager.playSound('Lose');
                }
            }
        } else {
            this.result.getChildByName('Label').getComponent(Label).string = '训练结束';
        }

        const messageStr = JSON.stringify({
            type: 'end',
            save_data: this._trainingTime >= 90,
            games: []
        });
        window.parent.postMessage(messageStr, '*');
        console.log('end: ' + messageStr);

        this._trainingTime = 0;
        this._endTimer();

        return true;
    }

    update(deltaTime: number) {
        //如果自己是队长，则发送位置
        // if (this._isLeader) {
        //     gameManager.sendClientInput({
        //         type: 'BallMove',
        //         pos: {
        //             x: this._selfBoat.position.x,
        //             y: this._selfBoat.position.y,
        //         }
        //     });
        //     // console.log('this._selfBoat.position: ' + this._selfBoat.position);
        // }

        for (let entry of this._boatMap.entries()) {
            if (this._rankMap.has(entry[0])) {
                this._rankMap.get(entry[0]).position = entry[1].position;
            }
        }
    }

    public onEndBtn(): void {
        audioManager.playSound('Button');

        let confirmStr = '确定要结束训练吗？';
        let confirm = instantiate(this.confirmPrefab);
        confirm.getComponent(Confirm).init(this, confirmStr);
        confirm.parent = this.node;
    }

    public onYesBtn(): void {
        gameManager.endRace();
    }
}
