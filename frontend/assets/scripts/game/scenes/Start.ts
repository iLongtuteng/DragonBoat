import { _decorator, Animation, assert, AudioSource, Button, director, find, instantiate, Node, Prefab, resources, SpriteFrame } from 'cc';
import { DEV } from 'cc/env';
import FWKComponent from '../../fwk/FWKComponent';
import { FWKMsg } from '../../fwk/mvc/FWKMvc';
import { gameManager } from '../GameManager';
import { audioManager } from '../AudioManager';
import { Warn } from '../prefabs/Warn';
const { ccclass, property } = _decorator;

@ccclass('Start')
export class Start extends FWKComponent {

    @property(Node)
    adviserView: Node;

    @property(Node)
    patientView: Node;

    @property(Button)
    easyBtn: Button;

    @property(Button)
    normalBtn: Button;

    @property(Button)
    hardBtn: Button;

    @property(Button)
    startBtn: Button;

    @property(Node)
    countAnim: Node;

    @property(Prefab)
    warnPrefab: Prefab;

    private _difficulty: number = 1;

    async onLoad() {
        resources.load('textures/BtnNormal/spriteFrame', SpriteFrame, (err, res) => {
            if (err) {
                console.log(err);
            } else {
                gameManager.greenSprite = res;
            }
        });
        resources.load('textures/BtnChosen/spriteFrame', SpriteFrame, (err, res) => {
            if (err) {
                console.log(err);
            } else {
                gameManager.blueSprite = res;
            }
        });

        if (!director.isPersistRootNode(find('AudioNode'))) {
            director.addPersistRootNode(find('AudioNode'));
            let audioSource = find('AudioNode').getComponent(AudioSource);
            assert(audioSource);
            audioManager.init(audioSource);
        }

        window.addEventListener('message', this._onMessage.bind(this));

        const messageStr = JSON.stringify({
            type: 'loaded'
        });
        window.parent.postMessage(messageStr, '*');
        console.log('loaded: ' + messageStr);

        this.startBtn.interactable = false;

        if (DEV) {
            gameManager.isAdviser = true;
            // gameManager.isAdviser = false;

            if (gameManager.isAdviser) {
                this.adviserView.active = true;
                this.patientView.active = false;
            } else {
                this.adviserView.active = false;
                this.patientView.active = true;
            }

            gameManager.initClient();
            await gameManager.connect();
            await gameManager.login();
            this.startBtn.interactable = true;

            let teamArr = [];
            for (let i = 0; i < 2; i++) {
                teamArr.push(i);
            }
            await gameManager.updateTeams(teamArr);

            if (gameManager.isAdviser) {
                gameManager.joinRace();
            } else {
                let teamIdx = 0;
                let patientName = '张三';
                // let teamIdx = 1;
                // let patientName = '李四';
                gameManager.joinRace(teamIdx, patientName, () => { }, (err) => {
                    let warn = instantiate(this.warnPrefab);
                    warn.parent = this.node;
                    warn.getComponent(Warn).label.string = err;
                });
            }

            gameManager.delayTime = 2000;
        }
    }

    onDestroy() {
        window.removeEventListener('message', this._onMessage.bind(this));
    }

    private async _onMessage(e: MessageEvent): Promise<void> {
        let obj = JSON.parse(e.data);

        if (obj.type == 'is_ready') {
            console.log('obj.type == "is_ready"');

            if (obj.is_adviser != null) {
                console.log('obj.is_adviser: ' + obj.is_adviser);
                gameManager.isAdviser = obj.is_adviser;

                if (gameManager.isAdviser) {
                    this.adviserView.active = true;
                    this.patientView.active = false;

                    this.scheduleOnce(() => {
                        this._refreshDiff(this._difficulty);
                    }, 0.2);
                } else {
                    this.adviserView.active = false;
                    this.patientView.active = true;
                }
            } else {
                this.adviserView.active = false;
                this.patientView.active = true;
            }

            if (obj.host != null) {
                console.log('obj.host: ' + obj.host);
                gameManager.initClient(obj.host);
                await gameManager.connect();
                await gameManager.login();
                this.startBtn.interactable = true;

                if (obj.teamLen != null) {
                    console.log('obj.teamLen: ' + obj.teamLen);
                    let teamArr = [];
                    for (let i = 0; i < obj.teamLen; i++) {
                        teamArr.push(i);
                    }
                    await gameManager.updateTeams(teamArr);

                    if (gameManager.isAdviser) {
                        gameManager.joinRace();
                    } else {
                        if (obj.teamIdx != null && obj.patientName != null) {
                            console.log('obj.teamIdx: ' + obj.teamIdx);
                            console.log('obj.patientName: ' + obj.patientName);
                            gameManager.joinRace(obj.teamIdx, obj.patientName, () => { }, (err) => {
                                let warn = instantiate(this.warnPrefab);
                                warn.parent = this.node;
                                warn.getComponent(Warn).label.string = err;
                            });
                        }
                    }
                }
            }

            if (obj.delay != null) {
                console.log('obj.delay: ' + obj.delay);
                gameManager.delayTime = obj.delay - 3000;
            }
        }

        if (obj.type == 'start_game') {
            console.log('obj.type == "start_game"');
            if (gameManager.isAdviser) {
                gameManager.startRace(this._difficulty);
                this.startBtn.interactable = false;
            }
        }

        if (obj.type == 'stop') {
            console.log('obj.type == "stop"');
            if (gameManager.isAdviser) {
                gameManager.endRace();
            }
        }
    }

    public onEasyBtn(): void {
        audioManager.playSound('Button');
        this._difficulty = 0;
        this._refreshDiff(this._difficulty);
    }

    public onNormalBtn(): void {
        audioManager.playSound('Button');
        this._difficulty = 1;
        this._refreshDiff(this._difficulty);
    }

    public onHardBtn(): void {
        audioManager.playSound('Button');
        this._difficulty = 2;
        this._refreshDiff(this._difficulty);
    }

    private _refreshDiff(num: number): void {
        switch (num) {
            case 0:
                this.easyBtn.getComponent(Button).normalSprite = gameManager.blueSprite;
                this.easyBtn.getComponent(Button).hoverSprite = gameManager.blueSprite;
                this.normalBtn.getComponent(Button).normalSprite = gameManager.greenSprite;
                this.normalBtn.getComponent(Button).hoverSprite = gameManager.greenSprite;
                this.hardBtn.getComponent(Button).normalSprite = gameManager.greenSprite;
                this.hardBtn.getComponent(Button).hoverSprite = gameManager.greenSprite;
                break;

            case 1:
                this.easyBtn.getComponent(Button).normalSprite = gameManager.greenSprite;
                this.easyBtn.getComponent(Button).hoverSprite = gameManager.greenSprite;
                this.normalBtn.getComponent(Button).normalSprite = gameManager.blueSprite;
                this.normalBtn.getComponent(Button).hoverSprite = gameManager.blueSprite;
                this.hardBtn.getComponent(Button).normalSprite = gameManager.greenSprite;
                this.hardBtn.getComponent(Button).hoverSprite = gameManager.greenSprite;
                break;

            case 2:
                this.easyBtn.getComponent(Button).normalSprite = gameManager.greenSprite;
                this.easyBtn.getComponent(Button).hoverSprite = gameManager.greenSprite;
                this.normalBtn.getComponent(Button).normalSprite = gameManager.greenSprite;
                this.normalBtn.getComponent(Button).hoverSprite = gameManager.greenSprite;
                this.hardBtn.getComponent(Button).normalSprite = gameManager.blueSprite;
                this.hardBtn.getComponent(Button).hoverSprite = gameManager.blueSprite;
                break;

            default:
                break;
        }
    }

    public onStartBtn(): void {
        audioManager.playSound('Button');

        gameManager.startRace(this._difficulty);
        this.startBtn.interactable = false;
    }

    public onMsg_ReadyEnterRace(msg: FWKMsg<any>): boolean {
        this.countAnim.active = true;
        this.node.getComponent(Animation).play();

        const messageStr = JSON.stringify({
            type: 'start',
            value: gameManager.difficulty
        });
        window.parent.postMessage(messageStr, '*');
        console.log('start: ' + messageStr);

        return true;
    }

    public enterRace(): void {
        director.loadScene('Game');
    }
}

