// waves with frequency of 1
let saw = t => (t % 1) * 2 - 1;
let sin = t => Math.sin(2 * Math.PI * t);
let sqr = t => ((t * 2) & 1) * 2 - 1;
let tri = t => (t > .5 ? 1 - t : t) * 4 - 1;

// operators
const ADD = 0, SUB = 1, MUL = 2, DIV = 3, POW = 4;

const invSampleRate = 1 / sampleRate;

let waves = {
    "saw": saw, "sawtooth": saw,
    "sin": sin, "sine": sin,
    "sqr": sqr, "square": sqr,
    "tri": tri, "triangle": tri
};

function applyOperator(operator, input, waveValue) {
    switch (operator) {
        case ADD: return input + waveValue;
        case SUB: return input - waveValue;
        case MUL: return input * waveValue;
        case DIV: return input / waveValue;
        case POW: return input ** waveValue;
    }
}

class SynthProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: "frequency", defaultValue: 0 }
        ];
    }

    constructor() {
        super();

        this.wave = tri;
        this.t = 0;
        this.isProcessing = true;

        this.port.onmessage = e => {
            this.wave = waves[e.data.type];
            
            if (e.data.isProcessing != undefined)
                this.isProcessing = e.data.isProcessing;
        };
    }

    process(inputs, outputs, params) {
        let input = inputs[0][0];
        input = input ? input : [];
            
        for (let i = 0; i < 128; i++) {
            let freq = params.frequency.length > 1 ? params.frequency[i] : params.frequency[0];
            outputs[0][0][i] = this.wave(this.t);
            this.t += invSampleRate * freq; // because calculating t on its own leads to problems when modulating frequency
        }

        return this.isProcessing;
    }
}

class ValueProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: "value", defaultValue: 1 }
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
        for (let i = 0; i < 128; i++)
            outputs[0][0][i] = params.value;

        return this.isProcessing;
    }
}

class OperationProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: "operator", defaultValue: -1 },
            { name: "aValue", defaultValue: 0 },
            { name: "bValue", defaultValue: 0 },
            { name: "isValue", defaultValue: 0 },
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
        let in0 = inputs[0][0];
        in0 = in0 ? in0 : [];

        let in1 = inputs[1][0];
        in1 = in1 ? in1 : [];

        for (let i = 0; i < 128; i++) {
            if (params.operator >= 0)
                outputs[0][0][i] = applyOperator(
                    params.operator[0],
                    params.isValue[0] & 0b01 ? params.aValue[0] : in0[i],
                    params.isValue[0] & 0b10 ? params.bValue[0] : in1[i]
                );
        }

        return this.isProcessing;
    }
}

class TriggerProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: "rate", defaultValue: 2 }
        ];
    }

    constructor() {
        super();

        this.t = 0;
        this.pattern = "x";
        this.patternIndex = -1;
        this.isProcessing = true;

        this.port.onmessage = e => {
            this.pattern = e.data.pattern;
            if (e.data.isProcessing != undefined)
                this.isProcessing = e.data.isProcessing;
        };
    }

    process(inputs, outputs, params) {
        for (let i = 0; i < 128; i++) {
            let rate = params.rate.length > 1 ? params.rate[i] : params.rate[0];
            let time = this.t % sampleRate;

            if (time < rate) this.patternIndex++;
            let patternChar = this.pattern[this.patternIndex%this.pattern.length];
            outputs[0][0][i] = time < 1 && patternChar == "x";

            if (patternChar == "o") outputs[0][0][i] = 1;
            this.t += rate;
        }

        return this.isProcessing;
    }
}

class ADSREnvelopeProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: "attack", defaultValue: .1 },
            { name: "decay", defaultValue: .2 },
            { name: "sustain", defaultValue: 0 },
            { name: "release", defaultValue: 0 },
            { name: "expStrength", defaultValue: 0 }
        ];
    }

    constructor() {
        super();

        this.initialTriggerTime = -1;
        this.triggerTime = -1;
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
            let attack = params.attack.length > 1 ? params.attack[i] : params.attack[0];
            let decay = params.decay.length > 1 ? params.decay[i] : params.decay[0];
            let sustain = params.sustain.length > 1 ? params.sustain[i] : params.sustain[0];
            let release = params.release.length > 1 ? params.release[i] : params.release[0];
            let expStrength = params.expStrength.length > 1 ? params.expStrength[i] : params.expStrength[0];

            if (input[i] > 0) {
                this.triggerTime = currentFrame;
                if (this.initialTriggerTime != currentFrame - 1)
                    this.initialTriggerTime = currentFrame;
            }

            let aTime = this.initialTriggerTime + attack * sampleRate;
            let dTime = aTime + decay * sampleRate;

            let output = 0;

            if (this.triggerTime < 0) continue;

            if (currentFrame < aTime) {
                output = (currentFrame - this.triggerTime) * invSampleRate / attack;
            } else if (currentFrame < dTime) {
                if (expStrength > 0)
                    output = (Math.pow(expStrength, 1 - (currentFrame - aTime) * invSampleRate / decay) - 1)
                        / (expStrength - 1) * (1 - sustain) + sustain;
                else
                    output = 1 - (currentFrame - aTime) * invSampleRate / decay * (1 - sustain);
            } else if (currentFrame >= dTime && this.triggerTime == currentFrame) {
                output = sustain;
            } else if (this.triggerTime != currentFrame) {
                output = sustain - (currentFrame - aTime) * invSampleRate / decay * sustain;
            }

            outputs[0][0][i] = output;
        }

        return this.isProcessing;
    }
}

class SequenceProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [];
    }

    constructor() {
        super();

        this.inputIndex = -1;
        this.isProcessing = true;

        this.port.onmessage = e => {
            if (e.data.isProcessing != undefined)
                this.isProcessing = e.data.isProcessing;
        };
    }

    process(inputs, outputs, params) {
        for (let i = 0; i < 128; i++) {
            if (inputs[0][0][i] > 0) {
                this.inputIndex++;
                this.inputIndex %= inputs.length - 1;
            }

            outputs[0][0][i] = inputs[this.inputIndex+1][0][i];
        }

        return this.isProcessing;
    }
}

registerProcessor('synth-processor', SynthProcessor);
registerProcessor('value-processor', ValueProcessor);
registerProcessor('operation-processor', OperationProcessor);
registerProcessor('trigger-processor', TriggerProcessor);
registerProcessor('adsr-envelope-processor', ADSREnvelopeProcessor);
registerProcessor('sequence-processor', SequenceProcessor);