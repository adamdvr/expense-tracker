'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'

import { CreateTransactionForm } from './create-transaction-form'

interface CreateTransactionDialogProps {
  /** Вызывается после успешного создания, когда диалог уже закрыт. */
  onCreated?: () => void
}

export function CreateTransactionDialog({ onCreated }: CreateTransactionDialogProps) {
  const [open, setOpen] = useState(false)

  const handleSuccess = () => {
    setOpen(false)
    onCreated?.()
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
        <CreateTransactionForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
