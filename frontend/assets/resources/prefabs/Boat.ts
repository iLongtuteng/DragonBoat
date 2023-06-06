import { _decorator, Animation, Component, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Boat')
export class Boat extends Component {

    private _maxSpeed: number = 0;
    private _speed: number = 0;
    private _accel: number = 200;

    onLoad() {
        this.scheduleOnce(() => {
            let state = this.node.getChildByName('Anim').getComponent(Animation).getState('Boat');
            state.play();
            state.setTime(Math.random() * state.duration);
        }, 0.1);
    }

    public setState(maxSpeed: number): void {
        this._maxSpeed = maxSpeed;
    }

    update(deltaTime: number) {
        if (this._speed < this._maxSpeed) {
            this._speed += this._accel * deltaTime;
            if (this._speed > this._maxSpeed) {
                this._speed = this._maxSpeed;
            }
        }

        if (this._speed > this._maxSpeed) {
            this._speed -= this._accel * deltaTime;
            if (this._speed < this._maxSpeed) {
                this._speed = this._maxSpeed;
            }
        }

        // console.log('this._speed: ' + this._speed);
        this.node.position = new Vec3(this.node.position.x + this._speed * deltaTime, this.node.position.y, this.node.position.z);
    }
}

