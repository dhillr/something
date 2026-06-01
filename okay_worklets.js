// waves with frequency of 1
let saw = t => (t % 1) * 2 - 1;
let sin = t => Math.sin(2 * Math.PI * t);
let sqr = t => ((t * 2) & 1) * 2 - 1;
let tri = t => (t > .5 ? 1 - t : t) * 4 - 1;

// operators
const ADD = 1, SUB = 2, MUL = 3, DIV = 4, POW = 5;

let waves = {
    "saw": saw, "sawtooth": saw,
    "sin": sin, "sine": sin,
    "sqr": sqr, "square": sqr,
    "tri": tri, "triangle": tri,
    "value": tri // placeholder
};

class SynthProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: "frequency", defaultValue: 440 },
            { name: "operator", defaultValue: -1 }
        ];
    }

    constructor() {
        super();

        this.wave = tri;
        this.waveType = undefined;
        this.isProcessing = true;

        this.port.onmessage = e => {
            this.waveType = e.data.type;
            this.wave = waves[this.waveType];
            
            if (e.data.isProcessing != undefined)
                this.isProcessing = e.data.isProcessing;
        };
    }

    process(inputs, outputs, params) {
        for (let i = 0; i < 128; i++) {
            let t = (currentFrame + i) / sampleRate * params.frequency;
            let waveValue = this.wave(t);

            if (this.waveType = value)
                waveType = params.frequency;

            if (params.operator < 0) {
                outputs[0][0][i] = waveValue;
            } else {
                let output = outputs[0][0][i];
                let input = inputs[0][0][i];
                switch (operator) {
                    case ADD:
                        output = input + waveValue;
                        break;
                    case SUB:
                        output = input - waveValue;
                        break;
                    case MUL:
                        output = input * waveValue;
                        break;
                    case DIV:
                        output = input / waveValue;
                        break;
                    case POW:
                        output = input ** waveValue;
                        break;
                }
            }
        }

        return this.isProcessing;
    }
}

registerProcessor('sp', SynthProcessor);