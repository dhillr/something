// waves with frequency of 1
let saw = t => (t % 1) * 2 - 1;
let sin = t => Math.sin(2 * Math.PI * t);
let sqr = t => ((t * 2) & 1) * 2 - 1;
let tri = t => (t > .5 ? 1 - t : t) * 4 - 1;

let waves = {"saw": saw, "sin": sin, "sqr": sqr, "tri": tri};

class SynthProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: "frequency", defaultValue: 440 }
        ];
    }

    constructor() {
        super();

        this.port.onmessage = e => {
            this.wave = waves[e.data.type];
        };
    }

    process(inputs, outputs, params) {
        for (let i = 0; i < 128; i++) {
            let t = (currentFrame + i) / sampleRate * params.frequency;
            outputs[0][0][i] = this.wave(t);
        }

        return true;
    }
}

registerProcessor('sp', SynthProcessor);