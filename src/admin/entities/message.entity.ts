import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('admin_messages')
export class AdminMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  content: string;

  @Column()
  direction: 'incoming' | 'outgoing';

  @Column()
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location';

  @Column('text', { nullable: true })
  metadata?: any;

  @ManyToOne(() => Conversation, conversation => conversation.messages)
  conversation: Conversation;

  @CreateDateColumn()
  createdAt: Date;
} 