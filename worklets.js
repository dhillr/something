// waves with frequency of 1
let saw = t => (t % 1) * 2 - 1;
let sin = t => Math.sin(2 * Math.PI * t);
let sqr = t => ((t * 2) & 1) * 2 - 1;
let tri = t => t > .5 ? .5 - t : t;

let waves = {"saw": saw, "sin": sin, "sqr": sqr, "tri": tri};

class SynthProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: "type", defaultValue: "tri" },
            { name: "frequency", defaultValue: 440 }
        ];
    }

    process(inputs, outputs, params) {
        if (!this.wave)
            this.wave = waves[params.type];

        for (let i = 0; i < 128; i++) {
            let t = (currentFrame + i) / sampleRate * params.frequency;
            outputs[0][0][i] = t % 1;
        }

        return true;
    }
}

registerProcessor('sp', SynthProcessor);