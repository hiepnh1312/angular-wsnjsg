import {
  Component,
  OnDestroy,
  AfterViewChecked,
  ElementRef,
  ViewChild,
  OnInit,
} from '@angular/core';
import { AudioRecordingService } from './audio-recording.service';
import { DomSanitizer } from '@angular/platform-browser';
import { STATUSES, Message } from './models';
import { USERS, RANDOM_MSGS, getRandom } from './data';
import { Injectable } from '@angular/core';
import { Observable, Observer } from 'rxjs';
import { AnonymousSubject } from 'rxjs/internal/Subject';
import { Subject } from 'rxjs';
import { map } from 'rxjs/operators';

const CHAT_URL = 'ws://localhost:5000';

export interface Message {
  source: string;
  content: string;
}
@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnDestroy, OnInit, AfterViewChecked {
  isRecording = false;
  recordedTime;
  blobUrl;
  teste;

  statuses = STATUSES;
  activeUser;
  users = USERS;
  expandStatuses = false;
  expanded = false;
  messageReceivedFrom = {
    img: 'https://cdn.livechat-files.com/api/file/lc/img/12385611/371bd45053f1a25d780d4908bde6b6ef',
    name: 'Media bot',
  };

  @ViewChild('scrollMe') private myScrollContainer: ElementRef;
  private subject: AnonymousSubject<MessageEvent>;
  public messages: Subject<any>;
  constructor(
    private audioRecordingService: AudioRecordingService,
    private sanitizer: DomSanitizer
  ) {
    const apiKey = 'YOUR_API_KEY';
    const url = `wss://viettelgroup.ai/voice/api/asr/v1/ws/decode_online?content-type=audio/x-raw,+layout=(string)interleaved,+rate=(int)16000,+format=(string)S16LE,+channels=(int)1&token=6ZbkDeEnRgOJKhmzH2ch7wtW5r6DEri1Eww5xcchdM9-gI3DoVancDKqQPO03mE0`;

    this.messages = <Subject<Message>>this.connect(url).pipe(
      map((response: MessageEvent): Message => {
        console.log('test', response.data);
        let data = JSON.parse(response.data);
        return data;
      })
    );
    this.audioRecordingService
      .recordingFailed()
      .subscribe(() => (this.isRecording = false));
    this.audioRecordingService
      .getRecordedTime()
      .subscribe((time) => (this.recordedTime = time));
    this.audioRecordingService.getRecordedBlob().subscribe((data) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const arrayBuffer = event.target.result as ArrayBuffer;
        console.log(arrayBuffer);
        const dataView = new DataView(arrayBuffer);
        const byteRate = dataView.getUint32(28, true); // Lấy byte rate từ header file audio
        const chunkSize = byteRate / 24;
        let offset = 44; // Header file audio là 44 byte
        while (offset < arrayBuffer.byteLength) {
          const chunk = new Uint8Array(
            arrayBuffer.slice(offset, offset + chunkSize)
          );
          setTimeout(() => {
            this.messages.next(chunk);
          }, 2500);
          offset += chunkSize;
        }
        reader.onloadend = () => {
          setTimeout(() => {
            this.messages.next('EOS');
          }, 2500);
        };
      };
      this.teste = data;
      const audioContext = new AudioContext();

      reader.readAsArrayBuffer(data.blob);
      // Đọc file audio và chia nhỏ thành các khung byte

      this.blobUrl = this.sanitizer.bypassSecurityTrustUrl(
        URL.createObjectURL(data.blob)
      );
    });
  }
  convertFileToArrayBuffer(file: any) {
    return new Promise<any>((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result));
      reader.addEventListener('error', (err) => reject(err));
      reader.readAsArrayBuffer(file);
    });
  }
  ngOnInit() {
    this.setUserActive(USERS[0]);
    this.scrollToBottom();
  }
  startRecording() {
    if (!this.isRecording) {
      this.isRecording = true;
      this.audioRecordingService.startRecording();
    }
  }
  public connect(url): AnonymousSubject<MessageEvent> {
    if (!this.subject) {
      this.subject = this.create(url);
      console.log('Successfully connected: ' + url);
    }
    return this.subject;
  }

  private create(url): AnonymousSubject<MessageEvent> {
    let ws = new WebSocket(url);
    let observable = new Observable((obs: Observer<MessageEvent>) => {
      ws.onmessage = obs.next.bind(obs);
      ws.onerror = obs.error.bind(obs);
      ws.onclose = obs.complete.bind(obs);
      return ws.close.bind(ws);
    });
    let observer = {
      error: null,
      complete: null,
      next: (data: any) => {
        console.log('Message sent to websocket: ', data);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      },
    };
    return new AnonymousSubject<MessageEvent>(observer, observable);
  }
  abortRecording() {
    if (this.isRecording) {
      this.isRecording = false;
      this.audioRecordingService.abortRecording();
    }
  }

  stopRecording() {
    if (this.isRecording) {
      this.audioRecordingService.stopRecording();
      this.isRecording = false;
    }
  }

  clearRecordedData() {
    this.blobUrl = null;
  }

  ngOnDestroy(): void {
    this.abortRecording();
  }

  download(): void {
    const url = window.URL.createObjectURL(this.teste.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.teste.title;
    link.click();
  }

  // chat
  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  addNewMessage(inputField) {
    const val = inputField.value?.trim();
    if (val.length) {
      this.activeUser.messages.push({ type: 'sent', message: val });
      this.activeUser.ws.send(
        JSON.stringify({ id: this.activeUser.id, message: val })
      );
    }
    inputField.value = '';
  }

  scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop =
        this.myScrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }

  setUserActive(user) {
    this.activeUser = user;
    this.connectToWS();
  }

  connectToWS() {
    if (this.activeUser.ws && this.activeUser.ws.readyState !== 1) {
      this.activeUser.ws = null;
      this.activeUser.status = STATUSES.OFFLINE;
    }
    if (this.activeUser.ws) {
      return;
    }
    const ws = new WebSocket('wss://compute.hotelway.ai:4443/?token=TESTTOKEN');
    this.activeUser.ws = ws;
    ws.onopen = (event) => this.onWSEvent(event, STATUSES.ONLINE);
    ws.onclose = (event) => this.onWSEvent(event, STATUSES.OFFLINE);
    ws.onerror = (event) => this.onWSEvent(event, STATUSES.OFFLINE);
    ws.onmessage = (result: any) => {
      const data = JSON.parse(result?.data || {});
      const userFound = this.users.find((u) => u.id === data.id);
      if (userFound) {
        userFound.messages.push(new Message('replies', data.message));
      }
    };
  }

  onWSEvent(event, status: STATUSES) {
    this.users.forEach((u) =>
      u.ws === event.target ? (u.status = status) : null
    );
  }
  btnType = 'normal';
  isStop = true;
  audioContext = null;
  recorder = null;
  ws = null;
  buffer = null;
  countSilentDuration = 0;
  message = '';
  connected = false;
  uri = 'wss://viettelgroup.ai/voice/api/asr/v1/ws/decode_online';
  SILENT_THRESHOLD = 1000;
  token = 'ds7koWzvU93282nvJJ1KOXJTv65-HEB7pu4FFpUqtYicKDJ4HgDkkseyGaE0bStJ';
  model = 'TROLYAO';

  toggleRecord() {
    if (this.isStop) {
      this.connectWS();
    } else {
      this.stop();
    }
  }
  record() {
    const $this = this;
    this.btnType = 'recording';

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }

        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then(function (stream) {
            const audioInput =
              $this.audioContext.createMediaStreamSource(stream);
            const bufferSize = 0;
            $this.recorder = $this.audioContext.createScriptProcessor(
              bufferSize,
              1,
              1
            );

            $this.recorder.onaudioprocess = function (e) {
              if (
                !$this.isStop &&
                $this.ws &&
                $this.ws.readyState === $this.ws.OPEN
              ) {
                $this.buffer = e.inputBuffer.getChannelData(0);
                const int16ArrayData = $this.convertFloat32ToInt16(
                  $this.buffer
                );
                $this.countSilentDuration +=
                  int16ArrayData.length / $this.audioContext.sampleRate;
                for (let i = 0; i < int16ArrayData.length; i++) {
                  if (Math.abs(int16ArrayData[i]) > this.SILENT_THRESHOLD) {
                    $this.countSilentDuration = 0;
                    break;
                  }
                }
                $this.ws.send(int16ArrayData.buffer);
              }
            };
            audioInput.connect($this.recorder);
            $this.recorder.connect($this.audioContext.destination);
          })
          .catch(function (e) {
            this.stop();
            console.log('sendFailAsr');
            // alert('Không kết nối được server asr!')
          });
      }
      this.isStop = false;
    } catch (e) {
      this.stop();
      console.log('sendFailAsr');
    }
  }
  connectWS() {
    this.connected = false;
    this.ws = new WebSocket(
      this.uri +
        '?content-type=audio/x-raw,+layout=(string)interleaved,+rate=(int)' +
        48000 +
        ',+format=(string)S16LE,+channels=(int)1&token=' +
        this.token +
        '&model=' +
        this.model
    );

    const $this = this;
    this.ws.onopen = function () {
      $this.connected = true;
    };

    this.ws.onclose = function () {
      $this.connected = false;
      // $this.stop()
    };

    this.ws.onmessage = function (e) {
      $this.message = e.data;
      const resp = JSON.parse(e.data);

      if (
        resp.status === 0 &&
        resp.result &&
        resp.result.hypotheses.length > 0
      ) {
        const text = decodeURI(resp.result.hypotheses[0].transcript_normed);
        if (text === '<unk>.') {
          return;
        }

        if (resp.result.final) {
          console.log('changeAsrText', $this.replaceText(text));
          console.log('sendAsrText', $this.replaceText(text));

          setTimeout(() => {
            $this.stop();
          }, 500);

          return;
        }

        console.log('changeAsrText', $this.replaceText(text));
      }
    };
  }
  closeWS() {
    if (this.ws && this.ws.readyState === this.ws.OPEN) {
      this.ws.send('EOS');
      this.ws.close();
    }
  }
  async stop() {
    this.closeWS();
    this.btnType = 'normal';
    this.isStop = true;

    try {
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }
    } catch (e) {}
  }
  convertFloat32ToInt16(float32ArrayData) {
    let l = float32ArrayData.length;
    const int16ArrayData = new Int16Array(l);
    while (l--) {
      int16ArrayData[l] = Math.min(1, float32ArrayData[l]) * 0x7fff;
    }
    return int16ArrayData;
  }
  replaceText(text) {
    const listText = {
      Hubbing: ['Hấp binh', 'Hắp binh', 'Hớp binh', 'hóp ping'],
      'Viettel Money': ['Viettel man ni', 'măn ni', 'man ni', 'mơ ni'],
      TV360: [
        'Ti vi ba sáu mươi',
        'Tờ vờ ba sáu mươi',
        'Tê vê ba sáu mươi',
        'Ti vi ba trăm sáu mươi',
        'Tờ vờ ba trăm sáu mươi',
        'Tê vê ba trăm sáu mươi',
        'tê vê 360',
        'Ti vi 360',
        'Tờ vờ 360',
        'Tê vê ba sáu mươi',
        'Ti vi 360',
        'Tờ vờ 360',
        'Tê vê 360',
        'tivi 360',
      ],
      EPASS: ['Ê pát', 'E pát', 'I pát', 'y pass'],
      SME: ['Ét em i', 'Sờ mờ e', 'ét mờ a', 'hát mờ a'],
      SMS: ['Ét em ét', 'Ét mờ ét'],
      Clinker: [
        'Cờ lanh cơ',
        'Cờ lanh cờ',
        'Cờ lin ke',
        'Cờ lin cờ',
        'Cờ nanh cơ',
        'Cờ nanh cờ',
        'Cờ nin ke',
        'Cờ nin cờ',
        'Clanh cơ',
        'Clanh cờ',
        'Clin ke',
        'Clin cờ',
        'Cnanh cơ',
        'Cnanh cờ',
        'Cnin ke',
        'Cnin cờ',
        'clanh ca',
        'clanh ka',
        'clint ca',
      ],
      License: ['Lai sần', 'Lai sừn', 'Nai sần', 'Nai sừn'],
      Cloud: ['Cờ lao', 'Cờ nao'],
    };

    for (const key in listText) {
      listText[key].forEach((item) => {
        text = text.replaceAll(new RegExp(item.toLowerCase(), 'ig'), key);
      });
    }

    return text;
  }
}
