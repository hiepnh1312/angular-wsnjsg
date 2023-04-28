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
    const url = `wss://viettelgroup.ai/voice/api/asr/v1/ws/decode_online?content-type=audio/x-raw,+layout=(string)interleaved,+rate=(int)16000,+format=(string)S16LE,+channels=(int)1&token=anonymous`;

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
        const dataView = new DataView(arrayBuffer);
        const byteRate = dataView.getUint32(28, true); // Lấy byte rate từ header file audio
        const chunkSize = byteRate / 4;
        let offset = 44; // Header file audio là 44 byte
        while (offset < arrayBuffer.byteLength) {
          const chunk = new Uint8Array(
            arrayBuffer.slice(offset, offset + chunkSize)
          );
          setTimeout(() => {
            this.messages.next(chunk);
          }, 1000);
          offset += chunkSize;
        }
        reader.onloadend = () => {
          setTimeout(() => {
            this.messages.next(new TextEncoder().encode('EOS'));
          }, 1000);
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
}
