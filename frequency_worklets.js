// waves with frequency of 1
let saw = t => (t % 1) * 2 - 1;
let sin = t => Math.sin(2 * Math.PI * t);
let sqr = t => ((t * 2) & 1) * 2 - 1;
let tri = t => (t > .5 ? 1 - t : t) * 4 - 1;

// operators
const ADD = 0, SUB = 1, MUL = 2, DIV = 3, POW = 4;

let waves = {
    "saw": saw, "sawtooth": saw,
    "sin": sin, "sine": sin,
    "sqr": sqr, "square": sqr,
    "tri": tri, "triangle": tri
};

function applyOperator(operator, input, waveValue) {
    switch (operator) {
        case ADD:
            console.log("add");
            return input + waveValue;
        case SUB:
            console.log("sub");
            return input - waveValue;
        case MUL:
            console.log("mul");
            return input * waveValue;
        case DIV:
            console.log("div");
            return input / waveValue;
        case POW:
            console.log("pow");
            return input ** waveValue;
    }
}

class SynthProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: "frequency", defaultValue: 440 }
        ];
    }

    constructor() {
        super();

        this.wave = tri;
        this.isProcessing = true;

        this.port.onmessage = e => {
            this.wave = waves[e.data.type];
            
            if (e.data.isProcessing != undefined)
                this.isProcessing = e.data.isProcessing;
        };
    }

    process(inputs, outputs, params) {
        for (let i = 0; i < 128; i++) {
            let t = (currentFrame + i) / sampleRate * params.frequency;
            console.log(params.frequency);
            outputs[0][0][i] = this.wave(t);
        }

        return this.isProcessing;
    }
}

class ValueProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: "value", defaultValue: 1 },
            { name: "operator", defaultValue: -1 }
        ];
    }

    constructor() {
        super();

        this.isProcessing = true;

        this.port.onmessage = e => {
            if (e.data.isProcessing != undefined)
                this.isProcessing = e.data.isProcessing;
        };
    }

    process(inputs, outputs, params) {
        let input = inputs[0][0];
        input = input ? input : [];

        for (let i = 0; i < 128; i++) {
            if (params.operator < 0) {
                outputs[0][0][i] = params.value;
            } else {
                console.log(params.operator, params.value);
                outputs[0][0][i] = applyOperator(params.operator, input[i], params.value);
            }
        }

        return this.isProcessing;
    }
}

registerProcessor('synth-processor', SynthProcessor);
registerProcessor('value-processor', ValueProcessor);