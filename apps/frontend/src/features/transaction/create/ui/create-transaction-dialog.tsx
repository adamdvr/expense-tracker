'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'

import type { Transaction } from '@/entities/transaction'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'

import { CreateTransactionForm } from './create-transaction-form'

interface CreateTransactionDialogProps {
  /** Вызывается после успешного создания (с созданной транзакцией), когда диалог уже закрыт. */
  onCreated?: (transaction: Transaction) => void
}

export function CreateTransactionDialog({ onCreated }: CreateTransactionDialogProps) {
  const [open, setOpen] = useState(false)

  const handleSuccess = (transaction: Transaction) => {
    setOpen(false)
    onCreated?.(transaction)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus data-icon="inline-start" />
        Добавить
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Новая транзакция</DialogTitle>
          <DialogDescription>Запишите доход или расход</DialogDescription>
        </DialogHeader>
        {/* Popup размонтируется при закрытии — форма каждый раз открывается чистой. */}
        <CreateTransactionForm
          onSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
          renderFooter={(actions) => <DialogFooter className="mt-6">{actions}</DialogFooter>}
        />
      </DialogContent>
    </Dialog>
  )
}
