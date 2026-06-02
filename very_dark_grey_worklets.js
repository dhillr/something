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

function applyOperator(operator, input, waveValue) {
    switch (operator) {
        case ADD:
            return input + waveValue;
        case SUB:
            return input - waveValue;
        case MUL:
            return input * waveValue;
        case DIV:
            return input / waveValue;
        case POW:
            return input ** waveValue;
    }
}

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

            if (this.waveType == "value")
                waveValue = params.frequency;

            if (params.operator < 0)
                outputs[0][0][i] = waveValue;
            else
                outputs[0][0][i] = applyOperator(params.operator, inputs[0][0][i], waveValue);
        }

        return this.isProcessing;
    }
}

registerProcessor('sp', SynthProcessor);