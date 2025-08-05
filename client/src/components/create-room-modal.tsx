import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { X } from "lucide-react";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

export function CreateRoomModal({ isOpen, onClose, currentUser }: CreateRoomModalProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    maxPlayers: "6",
    isPrivate: false,
    gameType: "number-guessing" as "number-guessing" | "odd-even" | "tic-tac-toe" | "bluff-card" | "chess",
  });

  // 체스 게임 선택 시 자동으로 최대 인원을 2명으로 설정
  useEffect(() => {
    if (formData.gameType === "chess") {
      setFormData(prev => ({ ...prev, maxPlayers: "2" }));
    }
  }, [formData.gameType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "오류",
        description: "방 이름을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest('POST', '/api/rooms', {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        hostId: currentUser.id,
        maxPlayers: parseInt(formData.maxPlayers),
        isPrivate: formData.isPrivate,
        gameType: formData.gameType,
      });

      const room = await response.json();
      
      toast({
        title: "방 생성 완료",
        description: `방 코드: ${room.code}`,
      });

      // Reset form
      setFormData({
        name: "",
        description: "",
        maxPlayers: "6",
        isPrivate: false,
        gameType: "bluff-card",
      });

      onClose();
      navigate(`/room/${room.id}`);
    } catch (error) {
      toast({
        title: "방 생성 실패",
        description: error instanceof Error ? error.message : "방을 생성할 수 없습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        name: "",
        description: "",
        maxPlayers: "6",
        isPrivate: false,
        gameType: "bluff-card",
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-lg font-semibold">새 방 만들기</DialogTitle>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
              disabled={isLoading}
            >
              <X size={16} />
            </Button>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="roomName" className="text-sm font-medium text-gray-400">
              방 이름
            </Label>
            <Input
              id="roomName"
              type="text"
              placeholder="방 이름을 입력하세요"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white focus:border-blue-500"
              maxLength={50}
              disabled={isLoading}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="gameType" className="text-sm font-medium text-gray-400">
              게임 종류
            </Label>
            <Select 
              value={formData.gameType} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, gameType: value as "number-guessing" | "odd-even" | "tic-tac-toe" | "bluff-card" | "chess" }))}
              disabled={isLoading}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white focus:border-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="number-guessing">숫자 맞추기</SelectItem>
                <SelectItem value="odd-even">홀짝 맞추기</SelectItem>
                <SelectItem value="tic-tac-toe">틱택토</SelectItem>
                <SelectItem value="bluff-card">속였군요?</SelectItem>
                <SelectItem value="chess">체스</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="maxPlayers" className="text-sm font-medium text-gray-400">
              최대 인원
            </Label>
            <Select 
              value={formData.maxPlayers} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, maxPlayers: value }))}
              disabled={isLoading}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white focus:border-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {formData.gameType === "chess" ? (
                  <SelectItem value="2">2명</SelectItem>
                ) : (
                  <>
                    <SelectItem value="4">4명</SelectItem>
                    <SelectItem value="6">6명</SelectItem>
                    <SelectItem value="8">8명</SelectItem>
                    <SelectItem value="10">10명</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="description" className="text-sm font-medium text-gray-400">
              방 설명 (선택)
            </Label>
            <Textarea
              id="description"
              placeholder="방에 대한 간단한 설명을 입력하세요"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white focus:border-blue-500 resize-none"
              rows={3}
              maxLength={200}
              disabled={isLoading}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPrivate"
              checked={formData.isPrivate}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, isPrivate: checked === true }))
              }
              disabled={isLoading}
            />
            <Label htmlFor="isPrivate" className="text-sm text-gray-400">
              비공개 방 (코드로만 입장 가능)
            </Label>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white"
              disabled={isLoading}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              disabled={isLoading}
            >
              {isLoading ? "생성 중..." : "방 만들기"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
