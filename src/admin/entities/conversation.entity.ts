import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Chatbot } from './chatbot.entity';
import { User } from '../../users/entities/user.entity';
import { AdminMessage } from './message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  chatbotId: string;

  @Column('text', { nullable: true })
  cart: {
    items: {
      productId: string;
      name: string;
      quantity: number;
      price: number;
    }[];
    total: number;
    paymentMethod: string;
    lastUpdated: Date;
  };

  @Column('text', { nullable: true })
  metadata?: any;

  @ManyToOne(() => Chatbot, chatbot => chatbot.conversations)
  chatbot: Chatbot;

  @ManyToOne(() => User, user => user.conversations)
  user: User;

  @OneToMany(() => AdminMessage, message => message.conversation)
  messages: AdminMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('text')
  summary: any;
} 